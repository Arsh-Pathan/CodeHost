import fs from 'fs-extra';
import path from 'path';
import { prisma } from '@codehost/database';
import { docker } from '@codehost/docker';
import { logger } from '@codehost/logger';
import { redis } from '@codehost/redis';
import { RESOURCE_TIERS } from '@codehost/config';
import { RunnerService } from './runner.js';
import { sendLowCreditWarningEmail } from '../lib/email.js';

const DEFAULT_FREE_IDLE_MINUTES = 30;
const LIFECYCLE_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BILLING_CHECK_INTERVAL_MS = 60 * 60 * 1000;  // 1 hour

async function getDirectorySizeBytes(dirPath: string): Promise<number> {
  try {
    const exists = await fs.pathExists(dirPath);
    if (!exists) return 0;

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let total = 0;

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += await getDirectorySizeBytes(fullPath);
      } else if (entry.isFile()) {
        const stat = await fs.stat(fullPath).catch(() => null);
        if (stat) total += stat.size;
      }
    }

    return total;
  } catch {
    return 0;
  }
}

/**
 * Stop free-tier containers that have been idle past the configured threshold.
 */
export async function hibernateIdleFreeProjects(): Promise<void> {
  const idleMinutes = Math.max(5, Number(process.env.FREE_TIER_IDLE_MINUTES) || DEFAULT_FREE_IDLE_MINUTES);
  const cutoff = new Date(Date.now() - idleMinutes * 60 * 1000);

  const idleProjects = await prisma.project.findMany({
    where: {
      tier: 'free',
      status: 'running',
      updatedAt: { lt: cutoff },
    },
  });

  for (const project of idleProjects) {
    try {
      await RunnerService.stopContainer(project.id);
      await prisma.project.update({
        where: { id: project.id },
        data: { status: 'stopped' },
      });
      logger.info(`Auto-hibernated idle free-tier project ${project.id} (${project.name}) after ${idleMinutes}m`);
    } catch (err) {
      logger.error({ error: err }, `Failed to hibernate idle free-tier project ${project.id}`);
    }
  }
}

/**
 * Downgrade users whose time-limited tier (e.g. Hackathon Pass) has expired.
 */
export async function expireTimedTiers(): Promise<void> {
  const now = new Date();
  const expiredUsers = await prisma.user.findMany({
    where: {
      tier: { not: 'free' },
      tierExpiresAt: { lt: now },
    },
    select: { id: true, tier: true, serverLimit: true },
  });

  const freeMaxProjects = RESOURCE_TIERS.free?.maxProjects || 1;

  for (const user of expiredUsers) {
    try {
      const [unlockedSlots, paidProjects] = await Promise.all([
        prisma.transaction.count({
          where: { wallet: { userId: user.id }, type: 'slot_unlock' },
        }),
        prisma.project.findMany({
          where: { userId: user.id, tier: { not: 'free' } },
          select: { tier: true },
        }),
      ]);

      const maxPaidProjectLimit = paidProjects.reduce(
        (max, p) => Math.max(max, RESOURCE_TIERS[p.tier]?.maxProjects || 0),
        0
      );
      const baselineLimit = Math.max(freeMaxProjects + unlockedSlots, maxPaidProjectLimit);
      const nextServerLimit = Math.max(1, Math.min(user.serverLimit, baselineLimit));

      await prisma.user.update({
        where: { id: user.id },
        data: {
          tier: 'free',
          tierExpiresAt: null,
          serverLimit: nextServerLimit,
        },
      });
      logger.info(`Expired timed tier (${user.tier}) for user ${user.id}; reverted to free (serverLimit=${nextServerLimit})`);
    } catch (err) {
      logger.error({ error: err }, `Failed to expire timed tier for user ${user.id}`);
    }
  }
}

/**
 * Enforce tier storage quotas on running projects by checking workspace disk usage.
 */
export async function enforceStorageQuotas(): Promise<void> {
  const runningProjects = await prisma.project.findMany({
    where: { status: 'running' },
    select: { id: true, name: true, tier: true },
  });

  for (const project of runningProjects) {
    const tierConfig = RESOURCE_TIERS[project.tier] || RESOURCE_TIERS.free;
    const projectDir = path.join(process.cwd(), 'storage', 'projects', project.id);
    const usedBytes = await getDirectorySizeBytes(projectDir);

    if (usedBytes > tierConfig.storage) {
      logger.warn(
        `Project ${project.id} (${project.name}) exceeded ${tierConfig.label} storage quota (${usedBytes} > ${tierConfig.storage} bytes)`
      );

      if (project.tier === 'free') {
        try {
          await RunnerService.stopContainer(project.id);
          await prisma.project.update({
            where: { id: project.id },
            data: { status: 'stopped' },
          });
          logger.info(`Stopped free-tier project ${project.id} for exceeding storage quota`);
        } catch (err) {
          logger.error({ error: err }, `Failed to stop project ${project.id} exceeding storage quota`);
        }
      }
    }
  }
}

/**
 * Process recurring 30-day credit charges for active paid-tier projects.
 */
export async function processMonthlyBilling(): Promise<void> {
  await expireTimedTiers();

  const paidProjects = await prisma.project.findMany({
    where: { tier: { not: 'free' }, status: 'running' },
    include: { user: true },
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const twentySevenDaysAgo = new Date(Date.now() - 27 * 24 * 60 * 60 * 1000);

  for (const project of paidProjects) {
    const tierConfig = RESOURCE_TIERS[project.tier];
    if (!tierConfig || tierConfig.creditsPerMonth === 0) continue;

    const wallet = await prisma.wallet.findUnique({ where: { userId: project.userId } });
    if (!wallet) continue;

    const lastCharge = await prisma.transaction.findFirst({
      where: { walletId: wallet.id, type: 'tier_charge', projectId: project.id },
      orderBy: { createdAt: 'desc' },
    });

    const referenceDate = lastCharge ? lastCharge.createdAt : project.createdAt;
    if (referenceDate > thirtyDaysAgo) {
      // Send a pre-renewal low-credit warning within 3 days of renewal (once per 24h)
      if (referenceDate <= twentySevenDaysAgo && wallet.balance < tierConfig.creditsPerMonth && project.user?.email) {
        const warnKey = `low-credit-warn:${project.id}`;
        const alreadyWarned = await redis.get(warnKey).catch(() => null);
        if (!alreadyWarned) {
          await redis.set(warnKey, '1', 'EX', 24 * 60 * 60).catch(() => {});
          sendLowCreditWarningEmail(project.user.email, {
            balance: wallet.balance,
            projectName: project.name,
          }).catch(() => {});
          logger.info(`Sent pre-renewal low-credit warning for project ${project.id}`);
        }
      }
      continue;
    }

    if (wallet.balance >= tierConfig.creditsPerMonth) {
      await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: tierConfig.creditsPerMonth } },
        });
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: -tierConfig.creditsPerMonth,
            type: 'tier_charge',
            description: `Monthly charge for ${project.name} (${tierConfig.label} tier)`,
            projectId: project.id,
          },
        });
      });
      logger.info(`Charged ${tierConfig.creditsPerMonth} credits for project ${project.id}`);
    } else {
      try {
        await RunnerService.stopContainer(project.id);
        await prisma.project.update({
          where: { id: project.id },
          data: { status: 'stopped' },
        });
        logger.info(`Stopped project ${project.id} due to insufficient credits`);
      } catch (err) {
        logger.error({ error: err }, `Failed to stop project ${project.id} for billing`);
      }
    }
  }
}

/**
 * Reconcile DB project status ('running') with actual Docker container state.
 */
export async function reconcileContainerStates(): Promise<void> {
  const runningProjects = await prisma.project.findMany({
    where: { status: 'running' },
    select: { id: true, name: true },
  });

  for (const project of runningProjects) {
    try {
      const container = docker.getContainer(`codehost-run-${project.id}`);
      const info = await container.inspect().catch(() => null);

      if (!info || !info.State?.Running) {
        const nextStatus = info?.State?.ExitCode && info.State.ExitCode !== 0 ? 'failed' : 'stopped';
        await prisma.project.update({
          where: { id: project.id },
          data: { status: nextStatus },
        });
        logger.warn(`Reconciled crashed/missing container for ${project.id} (${project.name}) -> ${nextStatus}`);
      }
    } catch (err) {
      logger.error({ error: err }, `Failed to reconcile container state for ${project.id}`);
    }
  }
}

/**
 * Start background lifecycle and billing intervals.
 */
export function startLifecycleJobs(): void {
  setInterval(() => {
    reconcileContainerStates().catch((error) => logger.error({ error }, 'State reconciliation error'));
    hibernateIdleFreeProjects().catch((error) => logger.error({ error }, 'Idle hibernation error'));
    enforceStorageQuotas().catch((error) => logger.error({ error }, 'Storage quota check error'));
  }, LIFECYCLE_CHECK_INTERVAL_MS);

  setInterval(() => {
    processMonthlyBilling().catch((error) => logger.error({ error }, 'Billing cron error'));
  }, BILLING_CHECK_INTERVAL_MS);
}
