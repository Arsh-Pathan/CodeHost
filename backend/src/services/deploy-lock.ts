import { redis } from '@codehost/redis';

export const FREE_DAILY_DEPLOY_LIMIT = 10;

export async function acquireDeploySlot(
  projectId: string,
  tier: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const lockKey = `deploy-lock:${projectId}`;
  const acquired = await redis.set(lockKey, '1', 'EX', 600, 'NX').catch(() => 'OK');
  if (acquired !== 'OK') {
    return {
      ok: false,
      status: 409,
      error: 'A deployment is already in progress for this project. Please wait for it to finish.',
    };
  }

  if (tier === 'free') {
    const today = new Date().toISOString().slice(0, 10);
    const dailyKey = `deploy-daily:${projectId}:${today}`;
    const count = await redis.incr(dailyKey).catch(() => 1);
    if (count === 1) {
      await redis.expire(dailyKey, 86400).catch(() => {});
    }
    if (count > FREE_DAILY_DEPLOY_LIMIT) {
      await redis.del(lockKey).catch(() => {});
      return {
        ok: false,
        status: 429,
        error: `Free tier allows up to ${FREE_DAILY_DEPLOY_LIMIT} deployments per day. Upgrade to Basic (50 cr/mo) for unlimited deployments.`,
      };
    }
  }

  return { ok: true };
}

export async function releaseDeployLock(projectId: string): Promise<void> {
  await redis.del(`deploy-lock:${projectId}`).catch(() => {});
}
