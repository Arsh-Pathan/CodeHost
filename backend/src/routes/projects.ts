import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { prisma } from '@codehost/database';
import { docker, demuxDockerLogBuffer } from '@codehost/docker';
import { redis } from '@codehost/redis';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { logger } from '@codehost/logger';
import { z } from 'zod';
import { BuilderService } from '../services/builder.js';
import { RunnerService } from '../services/runner.js';
import { acquireDeploySlot, releaseDeployLock } from '../services/deploy-lock.js';
import {
  ensureProjectBillingCurrent,
  recalculateUserServerLimit,
} from '../services/billing-guard.js';
import { RESOURCE_TIERS } from '@codehost/config';
import {
  validateProjectName,
  validateCustomDomain,
  sanitizeUserEnvVars,
} from '../lib/validation.js';

const router = Router();

// Apply auth middleware to all project routes
router.use(requireAuth);

const createProjectSchema = z.object({
  name: z.string().min(3).max(50),
  tier: z.enum(['free', 'basic', 'pro', 'business']).default('free'),
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name: rawName, tier } = createProjectSchema.parse(req.body);
    const nameCheck = validateProjectName(rawName);
    if (!nameCheck.valid) {
      return res.status(400).json({ error: nameCheck.error || 'Invalid project name' });
    }
    const name = nameCheck.normalized;
    const userId = req.user!.id;
    const tierConfig = RESOURCE_TIERS[tier];

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Please verify your email address before creating a project.' });
    }

    // Check if name is taken fast before transaction
    const existingProject = await prisma.project.findFirst({ where: { name } });
    if (existingProject) {
      return res.status(400).json({ error: 'Project name already taken across the platform' });
    }

    // Atomically lock User row, check serverLimit, create project, and deduct credits
    const project = await prisma.$transaction(async (tx) => {
      const lockedUsers = await tx.$queryRaw<Array<{ id: string; serverLimit: number }>>`
        SELECT "id", "serverLimit" FROM "User" WHERE "id" = ${userId} FOR UPDATE
      `;
      const lockedUser = lockedUsers[0];
      if (!lockedUser) {
        throw new Error('USER_NOT_FOUND');
      }

      const projectCount = await tx.project.count({ where: { userId } });
      if (projectCount >= lockedUser.serverLimit) {
        throw new Error(`SERVER_LIMIT:${lockedUser.serverLimit}`);
      }

      const created = await tx.project.create({
        data: {
          name,
          userId,
          status: 'idle',
          tier,
        },
      });

      if (tier !== 'free' && tierConfig.creditsPerMonth > 0) {
        const wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) {
          throw new Error(`INSUFFICIENT_CREDITS:${tierConfig.label} tier requires ${tierConfig.creditsPerMonth} credits/month. Please top up your wallet.`);
        }

        const debited = await tx.wallet.updateMany({
          where: { id: wallet.id, balance: { gte: tierConfig.creditsPerMonth } },
          data: { balance: { decrement: tierConfig.creditsPerMonth } },
        });
        if (debited.count === 0) {
          throw new Error(`INSUFFICIENT_CREDITS:${tierConfig.label} tier requires ${tierConfig.creditsPerMonth} credits/month. Please top up your wallet.`);
        }

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: -tierConfig.creditsPerMonth,
            type: 'tier_charge',
            projectId: created.id,
            description: `Initial charge for ${name} (${tierConfig.label} tier)`,
          },
        });

        await recalculateUserServerLimit(tx, userId);
      }

      return created;
    });

    logger.info(`Project created: ${project.id} by user ${userId}`);
    res.status(201).json({ project });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error.message?.startsWith('INSUFFICIENT_CREDITS:')) {
      return res.status(402).json({ error: error.message.replace('INSUFFICIENT_CREDITS:', '') });
    }
    if (error.message?.startsWith('SERVER_LIMIT:')) {
      const lim = Number(error.message.split(':')[1] || 1);
      return res.status(403).json({
        error: `Server limit reached (${lim} server${lim === 1 ? '' : 's'}). Unlock an additional server slot with credits from your dashboard.`,
      });
    }
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'Project name already taken across the platform' });
    }
    logger.error({ error }, 'Create project error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ projects });
  } catch (error) {
    logger.error({ error }, 'Get projects error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { email: true, username: true } } }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ project });
  } catch (error) {
    logger.error({ error }, 'Get project error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const locked = await redis.exists(`deploy-lock:${project.id}`).catch(() => 0);
    if (locked === 1) {
      return res.status(409).json({ error: 'Cannot delete a project while a deployment is actively building.' });
    }

    // Stop container first
    try {
      await RunnerService.stopContainer(project.id);
    } catch (e) {
      logger.warn(`Failed to stop container for deleted project ${project.id}`);
    }

    const projectDeployments = await prisma.deployment.findMany({
      where: { projectId: project.id },
      select: { id: true },
    });

    await prisma.deployment.deleteMany({
      where: { projectId: project.id }
    });

    await prisma.project.delete({
      where: { id: project.id }
    });

    await recalculateUserServerLimit(prisma, project.userId).catch(() => {});

    await fs.remove(path.join(process.cwd(), 'storage', 'projects', project.id)).catch(() => {});
    await redis.del(`deploy-lock:${project.id}`, `idle-net:${project.id}`, `low-credit-warn:${project.id}`).catch(() => {});
    await Promise.allSettled(
      projectDeployments.map((d) =>
        docker.getImage(`codehost-project-${project.id.toLowerCase()}:${d.id}`).remove({ force: true })
      )
    );

    logger.info(`Project deleted: ${project.id}`);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Delete project error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/restart', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { deployments: { where: { status: 'success' }, orderBy: { createdAt: 'desc' }, take: 1 } }
    });

    if (!project || project.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const locked = await redis.exists(`deploy-lock:${project.id}`).catch(() => 0);
    if (locked === 1) {
      return res.status(409).json({ error: 'A deployment is already in progress for this project.' });
    }

    const lastDeployment = project.deployments[0];
    if (!lastDeployment) {
      return res.status(400).json({ error: 'No successful deployment to restart' });
    }

    const billingCheck = await ensureProjectBillingCurrent(project.id, req.user!.id);
    if (!billingCheck.ok) {
      return res.status(billingCheck.status).json({ error: billingCheck.error });
    }

    const imageName = `codehost-project-${project.id.toLowerCase()}:${lastDeployment.id}`;

    await RunnerService.startContainer(project.id, lastDeployment.id, imageName);

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Restart project error');
    res.status(500).json({ error: 'Failed to restart project' });
  }
});

router.post('/:id/stop', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project || project.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await RunnerService.stopContainer(project.id);

    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'stopped', containerId: null }
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Stop project error');
    res.status(500).json({ error: 'Failed to stop project' });
  }
});

// Redeploy - rebuild from existing source (or re-clone from GitHub)
router.post('/:id/redeploy', async (req: AuthRequest, res) => {
  let lockToken: string | undefined;
  let lockedProjectId: string | undefined;
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project || project.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const billingCheck = await ensureProjectBillingCurrent(project.id, req.user!.id);
    if (!billingCheck.ok) {
      return res.status(billingCheck.status).json({ error: billingCheck.error });
    }

    const slot = await acquireDeploySlot(project.id, project.tier || 'free', req.user!.id);
    if (!slot.ok) {
      return res.status(slot.status).json({ error: slot.error });
    }
    lockToken = (slot as any).lockToken;
    lockedProjectId = project.id;

    const deployment = await prisma.deployment.create({
      data: {
        projectId: project.id,
        status: 'queued',
        source: project.repoUrl ? 'github' : 'files',
      }
    });

    res.status(202).json({ message: 'Redeploy queued', deploymentId: deployment.id });

    // Background pipeline
    void (async () => {
      try {
        const gitOptions = project.repoUrl
          ? { repoUrl: project.repoUrl, branch: project.repoBranch || 'main', subdir: project.repoSubdir || undefined }
          : undefined;

        const imageName = await BuilderService.buildProject(
          deployment.id,
          project.id,
          undefined,
          gitOptions
        );
        await RunnerService.startContainer(project.id, deployment.id, imageName);
      } catch (err) {
        logger.error({ err }, `Redeploy pipeline failed for ${deployment.id}`);
        await prisma.deployment.update({ where: { id: deployment.id }, data: { status: 'failed' } }).catch(() => {});
        await prisma.project.update({ where: { id: project.id }, data: { status: 'failed' } }).catch(() => {});
      } finally {
        await releaseDeployLock(project.id, lockToken);
      }
    })();
  } catch (error) {
    if (lockedProjectId && lockToken) {
      await releaseDeployLock(lockedProjectId, lockToken).catch(() => {});
    }
    logger.error({ error }, 'Redeploy error');
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to queue redeploy' });
    }
  }
});

// Get container logs
router.get('/:id/logs', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project || project.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    try {
      const container = docker.getContainer(project.containerId || `codehost-run-${project.id}`);
      const info = await container.inspect().catch(() => null);
      if (!info || info.Config?.Labels?.['codehost.project.id'] !== project.id) {
        return res.json({ logs: 'No active container.' });
      }
      const logBuffer = await container.logs({
        stdout: true,
        stderr: true,
        tail: 200,
        timestamps: true,
      });
      res.json({ logs: demuxDockerLogBuffer(logBuffer) });
    } catch {
      res.json({ logs: 'Container not running.' });
    }
  } catch (error) {
    logger.error({ error }, 'Get logs error');
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

router.get('/check-name/:name', async (req: AuthRequest, res) => {
  try {
    const nameCheck = validateProjectName(req.params.name);
    if (!nameCheck.valid) {
      return res.json({ available: false, reason: nameCheck.error });
    }
    const project = await prisma.project.findFirst({
      where: { name: nameCheck.normalized }
    });
    res.json({ available: !project, ...(project ? { reason: 'Project name is already taken' } : {}) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project || project.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { name, buildCommand, startCommand, dockerfileOverride, envVars, tier, customDomain } = req.body;

    if (buildCommand !== undefined && String(buildCommand).length > 1000) {
      return res.status(400).json({ error: 'Build command must be at most 1000 characters' });
    }
    if (startCommand !== undefined && String(startCommand).length > 1000) {
      return res.status(400).json({ error: 'Start command must be at most 1000 characters' });
    }
    if (dockerfileOverride !== undefined && String(dockerfileOverride).length > 65536) {
      return res.status(400).json({ error: 'Dockerfile override must be at most 64KB' });
    }

    // 1. Validate EVERY field BEFORE performing any credit charge or DB write
    let nextName = project.name;
    if (name !== undefined && String(name).trim().toLowerCase() !== project.name.toLowerCase()) {
      const nameCheck = validateProjectName(name);
      if (!nameCheck.valid) {
        return res.status(400).json({ error: nameCheck.error || 'Invalid name format' });
      }
      const existingProject = await prisma.project.findFirst({
        where: { name: nameCheck.normalized, id: { not: project.id } }
      });
      if (existingProject) {
        return res.status(400).json({ error: 'Subdomain already taken across the platform' });
      }
      nextName = nameCheck.normalized;
    }

    if (tier !== undefined && (!RESOURCE_TIERS[tier])) {
      return res.status(400).json({ error: 'Invalid tier' });
    }
    const newTier = tier && RESOURCE_TIERS[tier] ? tier : project.tier;
    const newTierConfig = RESOURCE_TIERS[newTier] || RESOURCE_TIERS['free'];
    const oldTierConfig = RESOURCE_TIERS[project.tier] || RESOURCE_TIERS['free'];
    const isUpgradingPaid = newTier !== 'free' && newTierConfig.creditsPerMonth > oldTierConfig.creditsPerMonth;

    let nextCustomDomain = project.customDomain;
    if (customDomain !== undefined) {
      const domainCheck = validateCustomDomain(customDomain);
      if (!domainCheck.valid) {
        return res.status(400).json({ error: domainCheck.error || 'Invalid custom domain' });
      }
      if (domainCheck.normalized) {
        if (newTier === 'free') {
          return res.status(403).json({
            error: 'Custom domains require a paid plan (Basic, Pro, or Business). Please upgrade to attach a custom domain.'
          });
        }
        const domainOwner = await prisma.project.findFirst({
          where: { customDomain: domainCheck.normalized, id: { not: project.id } },
        });
        if (domainOwner) {
          return res.status(400).json({
            error: 'This custom domain is already attached to another project'
          });
        }
      }
      nextCustomDomain = domainCheck.normalized;
    } else if (newTier === 'free' && project.customDomain) {
      nextCustomDomain = null;
    }

    const sanitizedEnvVars =
      envVars !== undefined ? sanitizeUserEnvVars(envVars) : project.envVars;

    // 2. Execute credit debit (if upgrading), project update, and serverLimit recalculation inside ONE atomic transaction
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const updated = await prisma.$transaction(async (tx) => {
      if (isUpgradingPaid) {
        const wallet = await tx.wallet.findUnique({ where: { userId: req.user!.id } });
        let chargeCredits = newTierConfig.creditsPerMonth - oldTierConfig.creditsPerMonth;

        // If upgrading from a paid tier whose 30-day cycle already expired, charge the full new tier cycle
        if (project.tier !== 'free' && wallet) {
          const lastCharge = await tx.transaction.findFirst({
            where: { walletId: wallet.id, type: 'tier_charge', projectId: project.id },
            orderBy: { createdAt: 'desc' },
          });
          const refDate = lastCharge ? lastCharge.createdAt : project.createdAt;
          if (refDate <= thirtyDaysAgo) {
            chargeCredits = newTierConfig.creditsPerMonth;
          }
        } else if (project.tier !== 'free') {
          chargeCredits = newTierConfig.creditsPerMonth;
        }

        if (!wallet) {
          throw new Error(`INSUFFICIENT_CREDITS:Insufficient credits. Upgrade requires ${chargeCredits} credits.`);
        }
        const debited = await tx.wallet.updateMany({
          where: { id: wallet.id, balance: { gte: chargeCredits } },
          data: { balance: { decrement: chargeCredits } },
        });
        if (debited.count === 0) {
          throw new Error(`INSUFFICIENT_CREDITS:Insufficient credits. Upgrade requires ${chargeCredits} credits.`);
        }
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: -chargeCredits,
            type: 'tier_charge',
            description: `Tier upgrade for ${nextName}: ${oldTierConfig.label} → ${newTierConfig.label}`,
            projectId: project.id,
          },
        });
      }

      const nextProject = await tx.project.update({
        where: { id: project.id },
        data: {
          name: nextName,
          buildCommand: buildCommand !== undefined ? String(buildCommand) : project.buildCommand,
          startCommand: startCommand !== undefined ? String(startCommand) : project.startCommand,
          dockerfileOverride: dockerfileOverride !== undefined ? String(dockerfileOverride) : project.dockerfileOverride,
          envVars: sanitizedEnvVars as any,
          tier: newTier,
          customDomain: nextCustomDomain,
        },
      });

      if (newTier !== project.tier) {
        await recalculateUserServerLimit(tx, req.user!.id);
      }

      return nextProject;
    });

    // 3. Auto-restart running container if hostname, tier, or custom domain changed
    const nameChanged = nextName !== project.name;
    const tierChanged = newTier !== project.tier;
    const domainChanged = nextCustomDomain !== project.customDomain;
    let restarting = false;

    if ((nameChanged || tierChanged || domainChanged) && project.status === 'running') {
      const locked = await redis.exists(`deploy-lock:${project.id}`).catch(() => 0);
      if (locked !== 1) {
        const lastDeployment = await prisma.deployment.findFirst({
          where: { projectId: project.id, status: 'success' },
          orderBy: { createdAt: 'desc' }
        });
        if (lastDeployment) {
          restarting = true;
          const imageName = `codehost-project-${project.id.toLowerCase()}:${lastDeployment.id}`;
          void (async () => {
            try {
              await RunnerService.startContainer(project.id, lastDeployment.id, imageName);
              logger.info(`Auto-restarted container for project ${project.id} after settings change (name/tier/domain)`);
            } catch (err) {
              logger.error({ error: err }, `Failed to auto-restart container after settings change for ${project.id}`);
            }
          })();
        }
      }
    }

    res.json({
      project: updated,
      restarting,
    });
  } catch (error: any) {
    if (error?.message?.startsWith('INSUFFICIENT_CREDITS:')) {
      return res.status(402).json({ error: error.message.replace('INSUFFICIENT_CREDITS:', '') });
    }
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'Project name or custom domain is already in use' });
    }
    logger.error({ error }, 'Update project error');
    res.status(500).json({ error: 'Failed to update project settings' });
  }
});

export default router;
