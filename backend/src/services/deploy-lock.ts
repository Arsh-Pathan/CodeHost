import crypto from 'crypto';
import { redis } from '@codehost/redis';

export const FREE_DAILY_DEPLOY_LIMIT = 10;
const DEPLOY_LOCK_TTL_SECONDS = 900; // 15m > max 10m paid build timeout

const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

const ATOMIC_DAILY_INCR_LUA = `
local current = redis.call("incr", KEYS[1])
if current == 1 then
  redis.call("expire", KEYS[1], ARGV[1])
end
return current
`;

const fallbackLocks = new Map<string, { token: string; expiresAt: number }>();

export async function acquireDeploySlot(
  projectId: string,
  tier: string,
  userId?: string
): Promise<{ ok: true; lockToken: string } | { ok: false; status: number; error: string }> {
  const lockKey = `deploy-lock:${projectId}`;
  const lockToken = crypto.randomUUID();
  const now = Date.now();
  let usedFallback = false;
  let acquired: string | null = null;

  try {
    acquired = await redis.set(lockKey, lockToken, 'EX', DEPLOY_LOCK_TTL_SECONDS, 'NX');
  } catch {
    usedFallback = true;
    const existing = fallbackLocks.get(lockKey);
    if (!existing || existing.expiresAt <= now) {
      fallbackLocks.set(lockKey, { token: lockToken, expiresAt: now + DEPLOY_LOCK_TTL_SECONDS * 1000 });
      acquired = 'OK';
    }
  }

  if (acquired !== 'OK') {
    return {
      ok: false,
      status: 409,
      error: 'A deployment is already in progress for this project. Please wait for it to finish.',
    };
  }

  if (!usedFallback) {
    fallbackLocks.set(lockKey, { token: lockToken, expiresAt: now + DEPLOY_LOCK_TTL_SECONDS * 1000 });
  }

  if (tier === 'free') {
    const today = new Date().toISOString().slice(0, 10);
    const scopeKey = userId || projectId;
    const dailyKey = `deploy-daily:${scopeKey}:${today}`;
    const count = Number(
      await redis.eval(ATOMIC_DAILY_INCR_LUA, 1, dailyKey, '86400').catch(() => 1)
    );
    if (count > FREE_DAILY_DEPLOY_LIMIT) {
      await releaseDeployLock(projectId, lockToken);
      return {
        ok: false,
        status: 429,
        error: `Free tier allows up to ${FREE_DAILY_DEPLOY_LIMIT} deployments per day. Upgrade to Basic (50 cr/mo) for unlimited deployments.`,
      };
    }
  }

  return { ok: true, lockToken };
}

export async function releaseDeployLock(projectId: string, lockToken?: string): Promise<void> {
  const lockKey = `deploy-lock:${projectId}`;
  const local = fallbackLocks.get(lockKey);
  if (!lockToken || local?.token === lockToken) {
    fallbackLocks.delete(lockKey);
  }
  if (lockToken) {
    await redis.eval(RELEASE_LOCK_LUA, 1, lockKey, lockToken).catch(() => {});
    return;
  }
  await redis.del(lockKey).catch(() => {});
}
