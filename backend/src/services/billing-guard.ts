import { prisma } from '@codehost/database';
import { RESOURCE_TIERS } from '@codehost/config';

/**
 * Resolve effective account tier taking time-limited passes (e.g. 72h Hackathon Pass) into account.
 */
export function getEffectiveUserTier(
  user: { tier?: string | null; tierExpiresAt?: Date | null } | null | undefined
): string {
  if (!user?.tier || user.tier === 'free') return 'free';
  if (user.tierExpiresAt && user.tierExpiresAt <= new Date()) return 'free';
  return RESOURCE_TIERS[user.tier] ? user.tier : 'free';
}

/**
 * Recompute a user's `serverLimit` from their effective account tier, active paid projects,
 * and purchased +1 slot unlocks, ensuring downgrades or deleted paid projects revoke bonus slots
 * without ever taking away paid 25-credit slot unlocks or ADMIN capacity.
 */
export async function recalculateUserServerLimit(
  txOrPrisma: any,
  userId: string
): Promise<number> {
  const [user, slotUnlocks, projects] = await Promise.all([
    txOrPrisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, tier: true, tierExpiresAt: true, serverLimit: true },
    }),
    txOrPrisma.transaction.count({
      where: { wallet: { userId }, type: 'slot_unlock' },
    }),
    txOrPrisma.project.findMany({
      where: { userId },
      select: { tier: true },
    }),
  ]);

  if (!user) return 1;
  if (user.role === 'ADMIN') {
    const adminLimit = Math.max(100, user.serverLimit);
    if (adminLimit !== user.serverLimit) {
      await txOrPrisma.user.update({ where: { id: userId }, data: { serverLimit: adminLimit } });
    }
    return adminLimit;
  }

  const freeMax = RESOURCE_TIERS.free?.maxProjects || 1;
  const effectiveUserTier = getEffectiveUserTier(user);
  const userTierMax = RESOURCE_TIERS[effectiveUserTier]?.maxProjects || freeMax;
  const projectTierMax = projects.reduce(
    (max: number, p: { tier: string }) => Math.max(max, RESOURCE_TIERS[p.tier]?.maxProjects || freeMax),
    freeMax
  );

  const nextLimit = Math.max(1, Math.max(userTierMax, projectTierMax) + slotUnlocks);
  if (nextLimit !== user.serverLimit) {
    await txOrPrisma.user.update({
      where: { id: userId },
      data: { serverLimit: nextLimit },
    });
  }
  return nextLimit;
}

/**
 * Verify that a paid-tier project's 30-day billing cycle is current before restarting/redeploying.
 * If more than 30 days have passed since the last tier charge, atomically attempts renewal.
 */
export async function ensureProjectBillingCurrent(
  projectId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, userId: true, tier: true, createdAt: true },
  });

  if (!project || project.userId !== userId) {
    return { ok: false, status: 404, error: 'Project not found' };
  }

  const tierConfig = RESOURCE_TIERS[project.tier];
  if (!tierConfig || project.tier === 'free' || tierConfig.creditsPerMonth <= 0) {
    return { ok: true };
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    return {
      ok: false,
      status: 402,
      error: `Paid project (${tierConfig.label}) requires an active wallet with at least ${tierConfig.creditsPerMonth} credits.`,
    };
  }

  const lastCharge = await prisma.transaction.findFirst({
    where: { walletId: wallet.id, type: 'tier_charge', projectId: project.id },
    orderBy: { createdAt: 'desc' },
  });

  const referenceDate = lastCharge ? lastCharge.createdAt : project.createdAt;
  if (referenceDate > thirtyDaysAgo) {
    return { ok: true };
  }

  // Renewal due — charge atomically with row-level sufficiency guard
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
        projectId: project.id,
        description: `Monthly renewal for ${project.name} (${tierConfig.label} tier)`,
      },
    });
    return true;
  });

  if (!charged) {
    return {
      ok: false,
      status: 402,
      error: `Insufficient credits to renew ${project.name} (${tierConfig.label} requires ${tierConfig.creditsPerMonth} credits/mo). Top up or downgrade to Free.`,
    };
  }

  return { ok: true };
}
