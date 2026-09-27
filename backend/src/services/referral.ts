import crypto from 'crypto';
import { prisma } from '@codehost/database';
import { logger } from '@codehost/logger';
import { env } from '@codehost/config';
import { sendReferralEarnedEmail } from '../lib/email.js';

export const REFERRER_REWARD_CREDITS = 100;
export const REFEREE_REWARD_CREDITS = 50;

/**
 * Generate a clean, unique referral code (e.g., ARSH-7K2M)
 */
export async function generateUniqueReferralCode(username: string): Promise<string> {
  const cleanUsername = username
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'CODE';

  for (let attempt = 0; attempt < 10; attempt++) {
    const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const candidate = `${cleanUsername}-${randomSuffix}`;
    const exists = await prisma.user.findUnique({ where: { referralCode: candidate } });
    if (!exists) {
      return candidate;
    }
  }

  // Fallback to random 8-character code
  return crypto.randomBytes(4).toString('hex').toUpperCase();
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
  await prisma.user.update({
    where: { id: userId },
    data: { referralCode: newCode },
  });

  return newCode;
}

/**
 * Process referral rewards for a newly registered referee
 */
export async function processReferralReward(
  refereeId: string,
  rawReferralCode: string | null | undefined
): Promise<{ success: boolean; message?: string }> {
  if (!rawReferralCode) return { success: false, message: 'No code provided' };

  const code = rawReferralCode.trim().toUpperCase();
  if (!code) return { success: false, message: 'Invalid code format' };

  try {
    const referrer = await prisma.user.findFirst({
      where: {
        referralCode: {
          equals: code,
          mode: 'insensitive',
        },
      },
    });

    if (!referrer) {
      logger.warn({ code, refereeId }, 'Referral code not found');
      return { success: false, message: 'Referral code does not exist' };
    }

    if (referrer.id === refereeId) {
      logger.warn({ refereeId }, 'User tried to self-refer');
      return { success: false, message: 'Self-referral is not permitted' };
    }

    // Check if referee already has received a referral bonus
    const existing = await prisma.referral.findUnique({
      where: { refereeId },
    });

    if (existing) {
      logger.warn({ refereeId }, 'Referee has already claimed a referral bonus');
      return { success: false, message: 'Referral reward already processed' };
    }

    // Fetch referee username for descriptive ledger entries
    const referee = await prisma.user.findUnique({
      where: { id: refereeId },
      select: { username: true },
    });

    await prisma.$transaction(async (tx: any) => {
      // 1. Record Referral
      await tx.referral.create({
        data: {
          referrerId: referrer.id,
          refereeId,
          referrerReward: REFERRER_REWARD_CREDITS,
          refereeReward: REFEREE_REWARD_CREDITS,
          status: 'completed',
        },
      });

      // 2. Credit Referee Wallet
      let refereeWallet = await tx.wallet.findUnique({ where: { userId: refereeId } });
      if (!refereeWallet) {
        refereeWallet = await tx.wallet.create({ data: { userId: refereeId, balance: 0 } });
      }

      await tx.wallet.update({
        where: { id: refereeWallet.id },
        data: { balance: { increment: REFEREE_REWARD_CREDITS } },
      });

      await tx.transaction.create({
        data: {
          walletId: refereeWallet.id,
          amount: REFEREE_REWARD_CREDITS,
          type: 'referral_bonus',
          description: `Welcome bonus: referred by @${referrer.username}`,
        },
      });

      // 3. Credit Referrer Wallet
      let referrerWallet = await tx.wallet.findUnique({ where: { userId: referrer.id } });
      if (!referrerWallet) {
        referrerWallet = await tx.wallet.create({ data: { userId: referrer.id, balance: 0 } });
      }

      await tx.wallet.update({
        where: { id: referrerWallet.id },
        data: { balance: { increment: REFERRER_REWARD_CREDITS } },
      });

      await tx.transaction.create({
        data: {
          walletId: referrerWallet.id,
          amount: REFERRER_REWARD_CREDITS,
          type: 'referral_bonus',
          description: `Referral reward for inviting @${referee?.username || 'new user'}`,
        },
      });
    });

    logger.info(
      { referrerId: referrer.id, refereeId, code },
      'Successfully processed referral rewards'
    );

    // Send email notification to referrer
    if (referrer.email) {
      prisma.wallet.findUnique({ where: { userId: referrer.id } }).then((w) => {
        sendReferralEarnedEmail(referrer.email, {
          referrerUsername: referrer.username,
          refereeUsername: referee?.username || 'new user',
          creditsEarned: REFERRER_REWARD_CREDITS,
          totalBalance: w?.balance ?? REFERRER_REWARD_CREDITS,
          referralUrl: `${env.APP_URL}/signup?ref=${referrer.referralCode || code}`,
        }).catch((err) => {
          logger.error({ err }, 'Failed to send referral reward email');
        });
      }).catch(() => {});
    }

    return { success: true };
  } catch (error) {
    logger.error({ error, refereeId, rawReferralCode }, 'Failed to process referral reward');
    return { success: false, message: 'Internal processing error' };
  }
}
