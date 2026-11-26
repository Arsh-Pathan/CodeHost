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
let startupReconcileTimer: NodeJS.Timeout | null = null;
let isReconciling = false;
let isHibernating = false;
let isEnforcingStorage = false;
let isExpiringTiers = false;
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

async function stopContainerIfUnlocked(projectId: string): Promise<boolean> {
  const locked = await redis.exists(`deploy-lock:${projectId}`).catch(() => 0);
  if (locked === 1) return false;
  await RunnerService.stopContainer(projectId);
  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'stopped', containerId: null },
  });
  return true;
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

      const locked = await redis.exists(`deploy-lock:${project.id}`).catch(() => 0);
      if (locked === 1) continue;

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

          // Require at least one prior baseline measurement so newly 30m containers measure actual recent traffic
          if (prevStr === null || totalNetBytes < Number(prevStr)) {
            continue;
          }

          const delta = totalNetBytes - Number(prevStr);
          if (delta > 2048) {
            await prisma.project.update({
              where: { id: project.id },
              data: { updatedAt: new Date() },
            }).catch(() => {});
            continue;
          }
        }

        const stopped = await stopContainerIfUnlocked(project.id);
        if (!stopped) continue;
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
  if (isExpiringTiers) return;
  isExpiringTiers = true;
  try {
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
            await stopContainerIfUnlocked(p.id).catch(() => {});
            logger.info(`Stopped excess free container ${p.id} (${p.name}) after Hackathon Pass expiration`);
          }
        }

        logger.info(`Expired timed tier (${user.tier}) for user ${user.id}; reverted to free (serverLimit=${nextServerLimit})`);
      } catch (err) {
        logger.error({ error: err }, `Failed to expire timed tier for user ${user.id}`);
      }
    }
  } finally {
    isExpiringTiers = false;
  }
}

/**
 * Enforce tier storage quotas on running projects by checking workspace + container writable layer disk usage.
 */
export async function enforceStorageQuotas(): Promise<void> {
  if (isEnforcingStorage) return;
  isEnforcingStorage = true;
  try {
    const runningProjects = await prisma.project.findMany({
      where: { status: 'running' },
      select: { id: true, name: true, tier: true },
    });

    const containersList: any[] = await (docker.listContainers({ all: false, size: true }) as unknown as Promise<any[]>).catch(() => []);
    const containerSizeByName = new Map<string, number>();
    for (const c of containersList) {
      const rwSize = Number(c?.SizeRw) || 0;
      for (const n of c?.Names || []) {
        containerSizeByName.set(String(n).replace(/^\//, ''), rwSize);
      }
    }

    for (const project of runningProjects) {
      const locked = await redis.exists(`deploy-lock:${project.id}`).catch(() => 0);
      if (locked === 1) continue;

      const tierConfig = RESOURCE_TIERS[project.tier] || RESOURCE_TIERS.free;
      const projectDir = path.join(process.cwd(), 'storage', 'projects', project.id);
      const workspaceBytes = await getDirectorySizeBytes(projectDir);
      const containerRwBytes = containerSizeByName.get(`codehost-run-${project.id}`) || 0;
      const usedBytes = workspaceBytes + containerRwBytes;

      if (usedBytes > tierConfig.storage) {
        logger.warn(
          `Project ${project.id} (${project.name}) exceeded ${tierConfig.label} storage quota (${usedBytes} > ${tierConfig.storage} bytes)`
        );

        try {
          const stopped = await stopContainerIfUnlocked(project.id);
          if (stopped) {
            logger.info(`Stopped project ${project.id} for exceeding storage quota`);
          }
        } catch (err) {
          logger.error({ error: err }, `Failed to stop project ${project.id} exceeding storage quota`);
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
        await stopContainerIfUnlocked(project.id).catch(() => {});
        logger.warn(`Stopped paid project ${project.id} because owner ${project.userId} has no wallet`);
        continue;
      }

      const billingOutcome = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${project.id}))`;

        const lastCharge = await tx.transaction.findFirst({
          where: { walletId: wallet.id, type: 'tier_charge', projectId: project.id },
          orderBy: { createdAt: 'desc' },
        });

        const referenceDate = lastCharge ? lastCharge.createdAt : project.createdAt;
        if (referenceDate > thirtyDaysAgo) {
          return { action: 'skip' as const, referenceDate };
        }

        const res = await tx.wallet.updateMany({
          where: { id: wallet.id, balance: { gte: tierConfig.creditsPerMonth } },
          data: { balance: { decrement: tierConfig.creditsPerMonth } },
        });
        if (res.count === 0) {
          return { action: 'insufficient' as const, referenceDate };
        }

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: -tierConfig.creditsPerMonth,
            type: 'tier_charge',
            description: `Monthly charge for ${project.name} (${tierConfig.label} tier)`,
            projectId: project.id,
          },
        });
        return { action: 'charged' as const, referenceDate };
      });

      if (billingOutcome.action === 'skip') {
        if (
          billingOutcome.referenceDate <= twentySevenDaysAgo &&
          wallet.balance < tierConfig.creditsPerMonth &&
          project.user?.email
        ) {
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

      if (billingOutcome.action === 'charged') {
        logger.info(`Charged ${tierConfig.creditsPerMonth} credits for project ${project.id}`);
      } else {
        try {
          await stopContainerIfUnlocked(project.id);
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
 * Reconcile DB project status ('running' / stale 'building') with actual Docker container state & deploy locks.
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
        const locked = await redis.exists(`deploy-lock:${project.id}`).catch(() => 0);
        if (locked === 1) continue;

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

    // Recover projects/deployments stuck in 'building'/'queued' after an unclean server restart
    const buildingCutoff = new Date(Date.now() - 2 * 60 * 1000);
    const stuckBuilding = await prisma.project.findMany({
      where: { status: 'building', updatedAt: { lt: buildingCutoff } },
      select: { id: true, name: true },
    });

    for (const project of stuckBuilding) {
      const locked = await redis.exists(`deploy-lock:${project.id}`).catch(() => 0);
      if (locked === 1) continue;

      await prisma.deployment.updateMany({
        where: { projectId: project.id, status: { in: ['queued', 'building'] } },
        data: { status: 'failed', logs: 'Build interrupted by server restart or worker timeout.' },
      }).catch(() => {});
      await prisma.project.update({
        where: { id: project.id },
        data: { status: 'failed' },
      }).catch(() => {});
      logger.warn(`Recovered stuck building project ${project.id} (${project.name}) -> failed`);
    }
  } finally {
    isReconciling = false;
  }
}

export async function cleanupStaleTempFiles(): Promise<void> {
  const cutoffMs = Date.now() - 30 * 60 * 1000;
  const dirs = [
    path.join(process.cwd(), 'tmp', 'uploads'),
    path.join(process.cwd(), 'tmp', 'builds'),
    path.join(process.cwd(), 'tmp', 'clones'),
  ];
  for (const dir of dirs) {
    try {
      if (!(await fs.pathExists(dir))) continue;
      const entries = await fs.readdir(dir);
      for (const name of entries) {
        const full = path.join(dir, name);
        const stat = await fs.lstat(full).catch(() => null);
        if (stat && stat.mtimeMs < cutoffMs) {
          await fs.remove(full).catch(() => {});
        }
      }
    } catch {
      // Ignore transient cleanup errors
    }
  }
}

async function runPeriodicMaintenance(): Promise<void> {
  await expireTimedTiers().catch((error) => logger.error({ error }, 'Timed tier expiry error'));
  await reconcileContainerStates().catch((error) => logger.error({ error }, 'State reconciliation error'));
  await hibernateIdleFreeProjects().catch((error) => logger.error({ error }, 'Idle hibernation error'));
  await enforceStorageQuotas().catch((error) => logger.error({ error }, 'Storage quota check error'));
  await cleanupStaleTempFiles().catch(() => {});
}

/**
 * Start background lifecycle and billing intervals.
 */
export function startLifecycleJobs(): void {
  stopLifecycleJobs();

  startupReconcileTimer = setTimeout(() => {
    reconcileContainerStates().catch((error) => logger.error({ error }, 'Startup reconciliation error'));
  }, 5_000);
  startupReconcileTimer.unref?.();

  lifecycleTimer = setInterval(() => {
    void runPeriodicMaintenance();
  }, LIFECYCLE_CHECK_INTERVAL_MS);

  billingTimer = setInterval(() => {
    processMonthlyBilling().catch((error) => logger.error({ error }, 'Billing cron error'));
  }, BILLING_CHECK_INTERVAL_MS);
}

/**
 * Clear background lifecycle timers during graceful shutdown.
 */
export function stopLifecycleJobs(): void {
  if (startupReconcileTimer) {
    clearTimeout(startupReconcileTimer);
    startupReconcileTimer = null;
  }
  if (lifecycleTimer) {
    clearInterval(lifecycleTimer);
    lifecycleTimer = null;
  }
  if (billingTimer) {
    clearInterval(billingTimer);
    billingTimer = null;
  }
}
