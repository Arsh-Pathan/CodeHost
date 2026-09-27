import { Router } from 'express';
import { prisma } from '@codehost/database';
import { logger } from '@codehost/logger';
import { env } from '@codehost/config';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import {
  ensureUserReferralCode,
  REFERRER_REWARD_CREDITS,
  REFEREE_REWARD_CREDITS,
} from '../services/referral.js';

const router = Router();

/**
 * GET /referrals/stats
 * Return current user's referral code, link, earned credits, and referrals list
 */
router.get('/stats', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const referralCode = await ensureUserReferralCode(userId);

    const [totalReferred, sumResult, recentReferrals, userWithReferral] = await Promise.all([
      prisma.referral.count({
        where: { referrerId: userId },
      }),
      prisma.referral.aggregate({
        where: { referrerId: userId },
        _sum: { referrerReward: true },
      }),
      prisma.referral.findMany({
        where: { referrerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          referee: {
            select: {
              id: true,
              username: true,
              name: true,
              avatarUrl: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          referralReceived: {
            include: {
              referrer: {
                select: {
                  username: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const totalEarnedCredits = sumResult._sum.referrerReward || 0;
    const referralUrl = `${env.APP_URL}/signup?ref=${encodeURIComponent(referralCode)}`;

    res.json({
      referralCode,
      referralUrl,
      totalReferred,
      totalEarnedCredits,
      rewardPerReferral: REFERRER_REWARD_CREDITS,
      bonusForReferee: REFEREE_REWARD_CREDITS,
      referredBy: userWithReferral?.referralReceived?.referrer?.username || null,
      recentReferrals: recentReferrals.map((r) => ({
        id: r.id,
        refereeUsername: r.referee.username,
        refereeName: r.referee.name,
        refereeAvatarUrl: r.referee.avatarUrl,
        rewardCredits: r.referrerReward,
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get referral stats');
    res.status(500).json({ error: 'Failed to retrieve referral statistics' });
  }
});

/**
 * GET /referrals/validate/:code
 * Public lookup to check validity of a referral code and get referrer display name
 */
router.get('/validate/:code', async (req, res) => {
  try {
    const rawCode = req.params.code;
    if (!rawCode) {
      return res.status(400).json({ valid: false, error: 'Code is required' });
    }

    const code = rawCode.trim().toUpperCase();
    const referrer = await prisma.user.findFirst({
      where: {
        referralCode: {
          equals: code,
          mode: 'insensitive',
        },
      },
      select: {
        username: true,
        name: true,
      },
    });

    if (!referrer) {
      return res.json({ valid: false });
    }

    res.json({
      valid: true,
      referrerUsername: referrer.username,
      referrerName: referrer.name || referrer.username,
      bonusCredits: REFEREE_REWARD_CREDITS,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to validate referral code');
    res.status(500).json({ valid: false, error: 'Validation error' });
  }
});

export default router;
