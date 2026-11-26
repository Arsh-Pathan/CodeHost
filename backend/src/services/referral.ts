import crypto from 'crypto';
import { prisma } from '@codehost/database';
import { logger } from '@codehost/logger';
import { env } from '@codehost/config';
import { sendReferralEarnedEmail } from '../lib/email.js';

export const REFERRER_REWARD_CREDITS = 50;
export const REFEREE_REWARD_CREDITS = 25;

/**
 * Normalize an email address for abuse checks (Gmail dot-insensitivity + subaddressing).
 */
export function canonicalizeEmail(rawEmail: string): string {
  const trimmed = rawEmail.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex <= 0) return trimmed;

  let local = trimmed.slice(0, atIndex);
  let domain = trimmed.slice(atIndex + 1);

  if (domain === 'googlemail.com') {
    domain = 'gmail.com';
  }

  const plusIndex = local.indexOf('+');
  if (plusIndex !== -1) {
    local = local.slice(0, plusIndex);
  }

  if (domain === 'gmail.com') {
    local = local.replace(/\./g, '');
  }

  return `${local}@${domain}`;
}

/**
 * Check whether an email matches the configured ADMIN_EMAILS allowlist.
 */
export function isConfiguredAdminEmail(rawEmail: string): boolean {
  const normalized = rawEmail.trim().toLowerCase();
  if (!normalized) return false;
  const allowlist = (env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => canonicalizeEmail(e))
    .filter(Boolean);
  return allowlist.includes(canonicalizeEmail(normalized));
}

/**
 * Generate a clean, unique referral code (e.g., ARSH-7K2M)
 */
export async function generateUniqueReferralCode(username: string): Promise<string> {
  const cleanUsername = username
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'CODE';

  for (let attempt = 0; attempt < 15; attempt++) {
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const candidate = attempt < 10 ? `${cleanUsername}-${randomSuffix.slice(0, 4)}` : `${cleanUsername}-${randomSuffix}`;
    const exists = await prisma.user.findUnique({ where: { referralCode: candidate } });
    if (!exists) {
      return candidate;
    }
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `CH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const exists = await prisma.user.findUnique({ where: { referralCode: candidate } });
    if (!exists) {
      return candidate;
    }
  }

  return `CH-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

/**
 * Ensure a user has an active referral code assigned
 */
export async function ensureUserReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, referralCode: true },
  });

  if (!user) throw new Error('User not found');
  if (user.referralCode) return user.referralCode;

  const newCode = await generateUniqueReferralCode(user.username);
  const updated = await prisma.user.updateMany({
    where: { id: userId, referralCode: null },
    data: { referralCode: newCode },
  });

  if (updated.count === 0) {
    const fresh = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    if (fresh?.referralCode) return fresh.referralCode;
  }

  return newCode;
}

/**
 * Record a pending referral on unverified registration so rewards are only paid after email verification.
 */
export async function recordPendingReferral(
  refereeId: string,
  rawReferralCode: string | null | undefined
): Promise<{ success: boolean; message?: string }> {
  if (!rawReferralCode) return { success: false, message: 'No code provided' };

  const code = rawReferralCode.trim().toUpperCase();
  if (!code) return { success: false, message: 'Invalid code format' };

  try {
    const [referrer, referee, existing] = await Promise.all([
      prisma.user.findFirst({
        where: { referralCode: { equals: code, mode: 'insensitive' } },
        select: { id: true, email: true, username: true },
      }),
      prisma.user.findUnique({
        where: { id: refereeId },
        select: { id: true, email: true, emailVerified: true },
      }),
      prisma.referral.findUnique({ where: { refereeId } }),
    ]);

    if (!referrer || !referee) {
      return { success: false, message: 'Referral code does not exist' };
    }

    if (referrer.id === refereeId || canonicalizeEmail(referrer.email) === canonicalizeEmail(referee.email)) {
      logger.warn({ refereeId, referrerId: referrer.id }, 'Blocked self-referral attempt');
      return { success: false, message: 'Self-referral is not permitted' };
    }

    if (existing) {
      return { success: false, message: 'Referral already recorded' };
    }

    await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        refereeId,
        referrerReward: REFERRER_REWARD_CREDITS,
        refereeReward: REFEREE_REWARD_CREDITS,
        status: 'pending',
      },
    });

    if (referee.emailVerified) {
      return completePendingReferral(refereeId);
    }

    return { success: true };
  } catch (error) {
    logger.error({ error, refereeId, rawReferralCode }, 'Failed to record pending referral');
    return { success: false, message: 'Internal processing error' };
  }
}

/**
 * Complete any pending referral once the referee verifies their email address.
 */
export async function completePendingReferral(
  refereeId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const referral = await prisma.referral.findUnique({
      where: { refereeId },
      include: {
        referrer: { select: { id: true, email: true, username: true, referralCode: true } },
        referee: { select: { id: true, email: true, username: true, emailVerified: true } },
      },
    });

    if (!referral || referral.status === 'completed') {
      return { success: false, message: 'No pending referral found' };
    }

    if (!referral.referee.emailVerified) {
      return { success: false, message: 'Referee email not yet verified' };
    }

    if (
      referral.referrer.id === referral.referee.id ||
      canonicalizeEmail(referral.referrer.email) === canonicalizeEmail(referral.referee.email)
    ) {
      await prisma.referral.delete({ where: { id: referral.id } }).catch(() => {});
      return { success: false, message: 'Self-referral is not permitted' };
    }

    let claimedNow = false;
    await prisma.$transaction(async (tx: any) => {
      const claim = await tx.referral.updateMany({
        where: { id: referral.id, status: 'pending' },
        data: { status: 'completed' },
      });

      if (claim.count === 0) {
        return;
      }
      claimedNow = true;

      const refereeWallet = await tx.wallet.upsert({
        where: { userId: referral.refereeId },
        create: { userId: referral.refereeId, balance: referral.refereeReward },
        update: { balance: { increment: referral.refereeReward } },
      });
      await tx.transaction.create({
        data: {
          walletId: refereeWallet.id,
          amount: referral.refereeReward,
          type: 'referral_bonus',
          description: `Welcome bonus: referred by @${referral.referrer.username}`,
        },
      });

      const referrerWallet = await tx.wallet.upsert({
        where: { userId: referral.referrerId },
        create: { userId: referral.referrerId, balance: referral.referrerReward },
        update: { balance: { increment: referral.referrerReward } },
      });
      await tx.transaction.create({
        data: {
          walletId: referrerWallet.id,
          amount: referral.referrerReward,
          type: 'referral_bonus',
          description: `Referral reward for inviting @${referral.referee.username}`,
        },
      });
    });

    if (claimedNow && referral.referrer.email) {
      prisma.wallet.findUnique({ where: { userId: referral.referrerId } }).then((w) => {
        sendReferralEarnedEmail(referral.referrer.email, {
          referrerUsername: referral.referrer.username,
          refereeUsername: referral.referee.username || 'new user',
          creditsEarned: referral.referrerReward,
          totalBalance: w?.balance ?? referral.referrerReward,
          referralUrl: `${env.APP_URL}/signup?ref=${referral.referrer.referralCode || ''}`,
        }).catch((err) => {
          logger.error({ err }, 'Failed to send referral reward email');
        });
      }).catch(() => {});
    }

    return { success: claimedNow };
  } catch (error) {
    logger.error({ error, refereeId }, 'Failed to complete pending referral');
    return { success: false, message: 'Internal processing error' };
  }
}

/**
 * Process referral rewards for a newly registered & verified referee (e.g. OAuth signup)
 */
export async function processReferralReward(
  refereeId: string,
  rawReferralCode: string | null | undefined
): Promise<{ success: boolean; message?: string }> {
  const rec = await recordPendingReferral(refereeId, rawReferralCode);
  if (!rec.success) return rec;
  return completePendingReferral(refereeId);
}
