import fs from 'fs-extra';
import path from 'path';
import { prisma } from '@codehost/database';
import { docker } from '@codehost/docker';
import { logger } from '@codehost/logger';
import { redis } from '@codehost/redis';
import { RESOURCE_TIERS } from '@codehost/config';
import { RunnerService } from './runner.js';
import { sendLowCreditWarningEmail } from '../lib/email.js';
import { getEffectiveUserTier, recalculateUserServerLimit } from './billing-guard.js';

const DEFAULT_FREE_IDLE_MINUTES = 30;
const LIFECYCLE_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BILLING_CHECK_INTERVAL_MS = 60 * 60 * 1000;  // 1 hour

let lifecycleTimer: NodeJS.Timeout | null = null;
let billingTimer: NodeJS.Timeout | null = null;
let isReconciling = false;
let isHibernating = false;
let isEnforcingStorage = false;
let isProcessingBilling = false;

async function getDirectorySizeBytes(dirPath: string): Promise<number> {
  try {
    const exists = await fs.pathExists(dirPath);
    if (!exists) return 0;

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let total = 0;

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += await getDirectorySizeBytes(fullPath);
      } else if (entry.isFile()) {
        const stat = await fs.lstat(fullPath).catch(() => null);
        if (stat) total += stat.size;
      }
    }

    return total;
  } catch {
    return 0;
  }
}

/**
 * Stop free-tier containers that have been genuinely idle past the configured threshold.
 * Skips containers with active HTTP/network traffic deltas since the previous check.
 */
export async function hibernateIdleFreeProjects(): Promise<void> {
  if (isHibernating) return;
  isHibernating = true;
  try {
    const idleMinutes = Math.max(5, Number(process.env.FREE_TIER_IDLE_MINUTES) || DEFAULT_FREE_IDLE_MINUTES);
    const cutoff = new Date(Date.now() - idleMinutes * 60 * 1000);

    const candidateProjects = await prisma.project.findMany({
      where: {
        tier: 'free',
        status: 'running',
        updatedAt: { lt: cutoff },
      },
      include: { user: { select: { tier: true, tierExpiresAt: true } } },
    });

    for (const project of candidateProjects) {
      // Do not auto-hibernate free projects currently boosted by an active paid/hackathon pass
      if (getEffectiveUserTier(project.user) !== 'free') {
        continue;
      }

      try {
        const container = docker.getContainer(`codehost-run-${project.id}`);
        const stats: any = await container.stats({ stream: false }).catch(() => null);
        if (stats?.networks) {
          let totalNetBytes = 0;
          for (const net of Object.values(stats.networks) as any[]) {
            totalNetBytes += (net?.rx_bytes || 0) + (net?.tx_bytes || 0);
          }
          const netKey = `idle-net:${project.id}`;
          const prevStr = await redis.get(netKey).catch(() => null);
          await redis.set(netKey, String(totalNetBytes), 'EX', idleMinutes * 60 + 300).catch(() => {});

          if (prevStr !== null) {
            const delta = totalNetBytes - Number(prevStr);
            if (delta > 2048) {
              // Container served live traffic (>2KB) since last lifecycle check — bump activity & keep running
              await prisma.project.update({
                where: { id: project.id },
                data: { updatedAt: new Date() },
              }).catch(() => {});
              continue;
            }
          }
        }

        await RunnerService.stopContainer(project.id);
        await prisma.project.update({
          where: { id: project.id },
          data: { status: 'stopped', containerId: null },
        });
        await redis.del(`idle-net:${project.id}`).catch(() => {});
        logger.info(`Auto-hibernated idle free-tier project ${project.id} (${project.name}) after ${idleMinutes}m`);
      } catch (err) {
        logger.error({ error: err }, `Failed to hibernate idle free-tier project ${project.id}`);
      }
    }
  } finally {
    isHibernating = false;
  }
}

/**
 * Downgrade users whose time-limited tier (e.g. Hackathon Pass) has expired
 * and stop any running containers beyond their reverted server limit.
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

  for (const user of expiredUsers) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { tier: 'free', tierExpiresAt: null },
      });

      const nextServerLimit = await recalculateUserServerLimit(prisma, user.id);

      // Stop any excess running free-tier containers above the reverted limit
      const runningFreeProjects = await prisma.project.findMany({
        where: { userId: user.id, status: 'running', tier: 'free' },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true },
      });

      const allProjectsCount = await prisma.project.count({ where: { userId: user.id } });
      if (allProjectsCount > nextServerLimit && runningFreeProjects.length > 0) {
        const paidCount = await prisma.project.count({
          where: { userId: user.id, tier: { not: 'free' } },
        });
        const allowedFreeRunning = Math.max(0, nextServerLimit - paidCount);
        const excess = runningFreeProjects.slice(allowedFreeRunning);
        for (const p of excess) {
          await RunnerService.stopContainer(p.id).catch(() => {});
          await prisma.project.update({
            where: { id: p.id },
            data: { status: 'stopped', containerId: null },
          }).catch(() => {});
          logger.info(`Stopped excess free container ${p.id} (${p.name}) after Hackathon Pass expiration`);
        }
      }

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
  if (isEnforcingStorage) return;
  isEnforcingStorage = true;
  try {
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
              data: { status: 'stopped', containerId: null },
            });
            logger.info(`Stopped free-tier project ${project.id} for exceeding storage quota`);
          } catch (err) {
            logger.error({ error: err }, `Failed to stop project ${project.id} exceeding storage quota`);
          }
        }
      }
    }
  } finally {
    isEnforcingStorage = false;
  }
}

/**
 * Process recurring 30-day credit charges for active paid-tier projects.
 */
export async function processMonthlyBilling(): Promise<void> {
  if (isProcessingBilling) return;
  isProcessingBilling = true;
  try {
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
      if (!wallet) {
        await RunnerService.stopContainer(project.id).catch(() => {});
        await prisma.project.update({
          where: { id: project.id },
          data: { status: 'stopped', containerId: null },
        }).catch(() => {});
        logger.warn(`Stopped paid project ${project.id} because owner ${project.userId} has no wallet`);
        continue;
      }

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

      const charged = await prisma.$transaction(async (tx) => {
        const res = await tx.wallet.updateMany({
          where: { id: wallet.id, balance: { gte: tierConfig.creditsPerMonth } },
          data: { balance: { decrement: tierConfig.creditsPerMonth } },
        });
        if (res.count === 0) return false;

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: -tierConfig.creditsPerMonth,
            type: 'tier_charge',
            description: `Monthly charge for ${project.name} (${tierConfig.label} tier)`,
            projectId: project.id,
          },
        });
        return true;
      });

      if (charged) {
        logger.info(`Charged ${tierConfig.creditsPerMonth} credits for project ${project.id}`);
      } else {
        try {
          await RunnerService.stopContainer(project.id);
          await prisma.project.update({
            where: { id: project.id },
            data: { status: 'stopped', containerId: null },
          });
          logger.info(`Stopped project ${project.id} due to insufficient credits`);
        } catch (err) {
          logger.error({ error: err }, `Failed to stop project ${project.id} for billing`);
        }
      }
    }
  } finally {
    isProcessingBilling = false;
  }
}

/**
 * Reconcile DB project status ('running') with actual Docker container state.
 */
export async function reconcileContainerStates(): Promise<void> {
  if (isReconciling) return;
  isReconciling = true;
  try {
    const runningProjects = await prisma.project.findMany({
      where: { status: 'running' },
      select: { id: true, name: true },
    });

    for (const project of runningProjects) {
      try {
        // Skip reconciliation while a deployment lock is active (container may be recreating)
        const locked = await redis.get(`deploy-lock:${project.id}`).catch(() => null);
        if (locked) continue;

        const container = docker.getContainer(`codehost-run-${project.id}`);
        const info = await container.inspect().catch(() => null);

        if (!info || !info.State?.Running) {
          const nextStatus = info?.State?.ExitCode && info.State.ExitCode !== 0 ? 'failed' : 'stopped';
          await prisma.project.update({
            where: { id: project.id },
            data: { status: nextStatus, containerId: null },
          });
          logger.warn(`Reconciled crashed/missing container for ${project.id} (${project.name}) -> ${nextStatus}`);
        }
      } catch (err) {
        logger.error({ error: err }, `Failed to reconcile container state for ${project.id}`);
      }
    }
  } finally {
    isReconciling = false;
  }
}

/**
 * Start background lifecycle and billing intervals.
 */
export function startLifecycleJobs(): void {
  stopLifecycleJobs();

  lifecycleTimer = setInterval(() => {
    expireTimedTiers().catch((error) => logger.error({ error }, 'Timed tier expiry error'));
    reconcileContainerStates().catch((error) => logger.error({ error }, 'State reconciliation error'));
    hibernateIdleFreeProjects().catch((error) => logger.error({ error }, 'Idle hibernation error'));
    enforceStorageQuotas().catch((error) => logger.error({ error }, 'Storage quota check error'));
  }, LIFECYCLE_CHECK_INTERVAL_MS);

  billingTimer = setInterval(() => {
    processMonthlyBilling().catch((error) => logger.error({ error }, 'Billing cron error'));
  }, BILLING_CHECK_INTERVAL_MS);
}

/**
 * Clear background lifecycle timers during graceful shutdown.
 */
export function stopLifecycleJobs(): void {
  if (lifecycleTimer) {
    clearInterval(lifecycleTimer);
    lifecycleTimer = null;
  }
  if (billingTimer) {
    clearInterval(billingTimer);
    billingTimer = null;
  }
}
