import { Router } from 'express';
import express from 'express';
import cors from 'cors';
import { prisma } from '@codehost/database';
import { logger } from '@codehost/logger';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { RESOURCE_TIERS, CREDIT_PACKAGES, CREDIT_PRICE_USD, CREDIT_PRICE_INR, env } from '@codehost/config';
import {
  getRazorpayClient,
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from '../services/razorpay.js';
import {
  sendPaymentConfirmationEmail,
  sendHackathonPassActivatedEmail,
  sendLowCreditWarningEmail,
} from '../lib/email.js';

const router = Router();

export function resolvePackageAmountInr(credits: number, orderAmountPaise?: number): number {
  if (typeof orderAmountPaise === 'number' && orderAmountPaise > 0) {
    return Math.round(orderAmountPaise / 100);
  }
  const pkg = CREDIT_PACKAGES.find((p) => p.credits === credits);
  if (pkg) {
    return pkg.priceInr;
  }
  return Math.round(credits * CREDIT_PRICE_INR);
}

export interface VerifiedOrderGrant {
  ok: boolean;
  status?: number;
  error?: string;
  creditsToAdd: number;
  orderAmountPaise: number;
  isHackathon: boolean;
}

export function resolveVerifiedOrderGrant(
  orderData: { amount?: number | string | null; notes?: Record<string, unknown> | null } | null | undefined,
  requestingUserId: string
): VerifiedOrderGrant {
  if (!orderData) {
    return {
      ok: false,
      status: 400,
      error: 'Order not found in Razorpay',
      creditsToAdd: 0,
      orderAmountPaise: 0,
      isHackathon: false,
    };
  }

  const notes = orderData.notes && typeof orderData.notes === 'object' ? orderData.notes : {};
  if (notes.userId && String(notes.userId) !== requestingUserId) {
    return {
      ok: false,
      status: 403,
      error: 'Order belongs to a different account',
      creditsToAdd: 0,
      orderAmountPaise: 0,
      isHackathon: false,
    };
  }

  const orderAmountPaise = Number(orderData.amount) || 0;
  let isHackathon = false;
  let creditsToAdd = 0;

  if (notes.planType === 'hackathon' && orderAmountPaise >= 4900) {
    isHackathon = true;
    creditsToAdd = 50;
  } else {
    // Compute maximum credits strictly justified by the verified paid paise amount
    const amountBasedCredits = Math.floor(orderAmountPaise / (CREDIT_PRICE_INR * 100));
    const eligiblePackageCredits = CREDIT_PACKAGES.filter(
      (pkg) => orderAmountPaise >= Math.round(pkg.priceInr * 100)
    ).reduce((best, pkg) => Math.max(best, pkg.credits), 0);

    const maxAllowedCredits = Math.max(amountBasedCredits, eligiblePackageCredits);
    if (maxAllowedCredits < 10) {
      return {
        ok: false,
        status: 400,
        error: `Paid amount is below minimum purchase (${Math.round(10 * CREDIT_PRICE_INR)} INR for 10 credits)`,
        creditsToAdd: 0,
        orderAmountPaise,
        isHackathon: false,
      };
    }

    if (notes.credits !== undefined) {
      const parsed = parseInt(String(notes.credits), 10);
      if (!isNaN(parsed) && parsed > 0) {
        creditsToAdd = Math.max(10, Math.min(parsed, maxAllowedCredits));
      }
    }

    if (!creditsToAdd || isNaN(creditsToAdd)) {
      creditsToAdd = maxAllowedCredits;
    }
  }

  return { ok: true, creditsToAdd, orderAmountPaise, isHackathon };
}

// All routes except webhook require auth
router.get('/wallet', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    let wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await prisma.wallet.create({ data: { userId } });
    }
    res.json({ wallet: { id: wallet.id, balance: wallet.balance } });
  } catch (error) {
    logger.error({ error }, 'Get wallet error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/transactions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return res.json({ transactions: [], total: 0, page, limit });
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where: { walletId: wallet.id } }),
    ]);

    res.json({ transactions, total, page, limit });
  } catch (error) {
    logger.error({ error }, 'Get transactions error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/tiers', requireAuth, async (_req: AuthRequest, res) => {
  const tiers = Object.entries(RESOURCE_TIERS).map(([key, t]) => ({
    id: key,
    label: t.label,
    memory: t.memory,
    cpus: t.cpus,
    storage: t.storage,
    creditsPerMonth: t.creditsPerMonth,
    maxProjects: t.maxProjects,
    priceUsd: t.creditsPerMonth * CREDIT_PRICE_USD,
    priceInr: t.creditsPerMonth * CREDIT_PRICE_INR,
  }));
  res.json({
    tiers,
    creditPackages: CREDIT_PACKAGES,
    creditPriceUsd: CREDIT_PRICE_USD,
    creditPriceInr: CREDIT_PRICE_INR,
    currency: 'INR',
    razorpayKeyId: env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '',
  });
});

// Create Order Handler (Supports predefined packages, custom credits, & hackathon pass)
export const handleCreateRazorpayOrder = async (req: AuthRequest, res: any) => {
  try {
    const { credits, amount: rawAmount, currency = 'INR', receipt: customReceipt, planType } = req.body;
    let amountInPaise = 0;
    const notes: Record<string, string> = {};

    if (req.user) {
      notes.userId = req.user.id;
    }

    if (planType === 'hackathon') {
      // Weekend Hackathon Pass: ₹49 flat for 72h Pro Access
      amountInPaise = 4900;
      notes.planType = 'hackathon';
      notes.credits = '50';
    } else if (credits !== undefined) {
      const parsedCredits = parseInt(String(credits), 10);
      if (isNaN(parsedCredits) || parsedCredits < 10) {
        return res.status(400).json({ error: 'Minimum purchase is 10 credits' });
      }
      const pkg = CREDIT_PACKAGES.find((p) => p.credits === parsedCredits);
      if (pkg) {
        amountInPaise = Math.round(pkg.priceInr * 100);
      } else {
        // Custom credit purchase rate (1 credit = 1.60 INR = 160 paise)
        amountInPaise = Math.round(parsedCredits * CREDIT_PRICE_INR * 100);
      }
      notes.credits = String(parsedCredits);
    } else if (rawAmount !== undefined) {
      const parsed = Number(rawAmount);
      const minPaise = Math.round(10 * CREDIT_PRICE_INR * 100);
      if (isNaN(parsed) || parsed < minPaise) {
        return res.status(400).json({ error: `Minimum amount is ${minPaise} paise (INR ${Math.round(minPaise / 100)} for 10 credits)` });
      }
      amountInPaise = Math.round(parsed);
      notes.credits = String(Math.floor(amountInPaise / (CREDIT_PRICE_INR * 100)));
    } else {
      return res.status(400).json({ error: 'Amount, credits package, or planType is required' });
    }

    const receipt = customReceipt || `rcpt_${req.user?.id ? req.user.id.slice(0, 8) : 'guest'}_${Date.now()}`;
    const order = await createRazorpayOrder({
      amount: amountInPaise,
      currency,
      receipt,
      notes,
    });

    const keyId = env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '';

    return res.json({
      order_id: order.id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
      keyId: keyId,
    });
  } catch (error: any) {
    logger.error({ error }, 'Razorpay create order error');
    return res.status(500).json({ error: error.message || 'Failed to create Razorpay order' });
  }
};

// Verify Payment Signature Handler
export const handleVerifyRazorpayPayment = async (req: AuthRequest, res: any) => {
  try {
    const orderId = req.body.razorpay_order_id || req.body.razorpayOrderId;
    const paymentId = req.body.razorpay_payment_id || req.body.razorpayPaymentId;
    const signature = req.body.razorpay_signature || req.body.razorpaySignature;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        error: 'Missing required payment verification fields (order_id, payment_id, signature)',
      });
    }

    const isValid = verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValid) {
      logger.warn({ orderId, paymentId }, 'Razorpay payment signature mismatch');
      return res.status(400).json({
        error: 'Invalid payment signature. Verification failed.',
      });
    }

    // If authenticated, credit user's wallet
    if (req.user?.id) {
      const userId = req.user.id;
      // Fast idempotency check
      const existingTx = await prisma.transaction.findFirst({
        where: { razorpayPaymentId: paymentId },
      });

      if (existingTx) {
        return res.json({
          success: true,
          message: 'Payment already processed',
          credits: existingTx.amount,
        });
      }

      // Securely read credits and planType strictly from verified Razorpay order
      let orderData: any;
      try {
        const client = getRazorpayClient();
        orderData = await client.orders.fetch(orderId);
      } catch (fetchErr) {
        logger.error({ fetchErr, orderId }, 'Failed to fetch order from Razorpay during verification');
        return res.status(502).json({ error: 'Failed to verify payment with Razorpay. Please retry in a few seconds.' });
      }

      const grant = resolveVerifiedOrderGrant(orderData, userId);
      if (!grant.ok) {
        return res.status(grant.status || 400).json({ error: grant.error });
      }
      const { creditsToAdd, orderAmountPaise, isHackathon } = grant;

      const hackathonExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const proMaxProjects = RESOURCE_TIERS.pro?.maxProjects || 5;

      let result: { wallet: any; transaction: any; duplicate?: boolean };
      try {
        result = await prisma.$transaction(async (tx: any) => {
          // Serialize concurrent verify + webhook invocations on the same paymentId
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${String(paymentId)}))`;

          const alreadyProcessed = await tx.transaction.findFirst({
            where: { razorpayPaymentId: paymentId },
          });
          if (alreadyProcessed) {
            const w = await tx.wallet.findUnique({ where: { id: alreadyProcessed.walletId } });
            return { wallet: w, transaction: alreadyProcessed, duplicate: true };
          }

          let wallet = await tx.wallet.findUnique({ where: { userId } });
          if (!wallet) {
            wallet = await tx.wallet.create({ data: { userId } });
          }

          const updatedWallet = await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: creditsToAdd } },
          });

          // If Hackathon Pass, upgrade user to pro for 72 hours and expand serverLimit
          if (isHackathon) {
            const currentUser = await tx.user.findUnique({ where: { id: userId }, select: { serverLimit: true } });
            await tx.user.update({
              where: { id: userId },
              data: {
                tier: 'pro',
                tierExpiresAt: hackathonExpiresAt,
                serverLimit: Math.max(currentUser?.serverLimit ?? 1, proMaxProjects),
              },
            });
          }

          const transaction = await tx.transaction.create({
            data: {
              walletId: wallet.id,
              amount: creditsToAdd,
              type: 'purchase',
              description: isHackathon ? 'Weekend Hackathon Pass (72h Pro Access)' : `Purchased ${creditsToAdd} credits`,
              razorpayOrderId: orderId,
              razorpayPaymentId: paymentId,
            },
          });

          return { wallet: updatedWallet, transaction, duplicate: false };
        });
      } catch (txErr: any) {
        if (txErr?.code === 'P2002') {
          const dup = await prisma.transaction.findFirst({ where: { razorpayPaymentId: paymentId } });
          return res.json({
            success: true,
            message: 'Payment already processed',
            credits: dup?.amount ?? creditsToAdd,
          });
        }
        throw txErr;
      }

      if (result.duplicate) {
        return res.json({
          success: true,
          message: 'Payment already processed',
          credits: result.transaction.amount,
        });
      }

      // Send confirmation email asynchronously
      try {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, username: true } });
        if (user && user.email) {
          if (isHackathon) {
            sendHackathonPassActivatedEmail(user.email, {
              expiresAt: hackathonExpiresAt,
              username: user.username,
            }).catch((err) => logger.error({ err }, 'Error sending hackathon email'));
          } else {
            sendPaymentConfirmationEmail(user.email, {
              credits: creditsToAdd,
              amountInr: resolvePackageAmountInr(creditsToAdd, orderAmountPaise),
              newBalance: result.wallet.balance,
              transactionId: result.transaction.id,
            }).catch((err) => logger.error({ err }, 'Error sending payment confirmation email'));
          }
        }
      } catch (emailErr) {
        logger.error({ emailErr }, 'Error looking up user for confirmation email');
      }

      return res.json({
        success: true,
        message: isHackathon
          ? 'Weekend Hackathon Pass activated successfully! Pro features unlocked for 72 hours.'
          : 'Payment verified and credits added successfully',
        balance: result.wallet.balance,
        transaction: result.transaction,
        hackathon: isHackathon,
      });
    }

    return res.json({
      success: true,
      message: 'Payment verified successfully',
      orderId,
      paymentId,
    });
  } catch (error: any) {
    logger.error({ error }, 'Razorpay verify payment error');
    return res.status(500).json({ error: error.message || 'Payment verification failed' });
  }
};

// Mount Razorpay endpoints
router.post('/razorpay/create-order', requireAuth, handleCreateRazorpayOrder);
router.post('/create-order', requireAuth, handleCreateRazorpayOrder);
router.post('/razorpay/verify', requireAuth, handleVerifyRazorpayPayment);
router.post('/razorpay/verify-payment', requireAuth, handleVerifyRazorpayPayment);
router.post('/verify-payment', requireAuth, handleVerifyRazorpayPayment);

// Webhook Handler
export const handleRazorpayWebhook = async (req: any, res: any) => {
  try {
    const signature = (req.headers['x-razorpay-signature'] || '') as string;
    const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);

    if (!signature || !verifyRazorpayWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
    const eventType = event.event;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const payment = event.payload?.payment?.entity;
      const order = event.payload?.order?.entity;
      const paymentId = payment?.id;
      const orderId = payment?.order_id || order?.id;
      const webhookAmountPaise = Number(payment?.amount ?? order?.amount) || 0;
      const webhookNotes = order?.notes || payment?.notes || {};
      const userId = webhookNotes.userId ? String(webhookNotes.userId) : '';

      if (userId && paymentId) {
        // Verify paid grant strictly against Razorpay's authoritative order amount / Razorpay API
        let verifiedOrder: any = { amount: webhookAmountPaise, notes: webhookNotes };
        if (orderId) {
          try {
            const fetched = await getRazorpayClient().orders.fetch(orderId);
            if (fetched) verifiedOrder = fetched;
          } catch {
            // Fall back to webhook-verified payment amount if Razorpay API fetch is temporarily unavailable
          }
        }

        const grant = resolveVerifiedOrderGrant(verifiedOrder, userId);
        if (!grant.ok) {
          logger.warn({ paymentId, orderId, userId, reason: grant.error }, 'Webhook grant validation rejected');
          return res.json({ status: 'ignored' });
        }

        const { creditsToAdd: credits, orderAmountPaise, isHackathon } = grant;
        const hackathonExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
        const proMaxProjects = RESOURCE_TIERS.pro?.maxProjects || 5;

        let result: { wallet: any; transaction: any; duplicate?: boolean } | null = null;
        try {
          result = await prisma.$transaction(async (tx: any) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${String(paymentId)}))`;

            const existing = await tx.transaction.findFirst({
              where: { razorpayPaymentId: paymentId },
            });
            if (existing) {
              return { wallet: null, transaction: existing, duplicate: true };
            }

            let wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) {
              wallet = await tx.wallet.create({ data: { userId } });
            }

            const updatedWallet = await tx.wallet.update({
              where: { id: wallet.id },
              data: { balance: { increment: credits } },
            });

            if (isHackathon) {
              const currentUser = await tx.user.findUnique({ where: { id: userId }, select: { serverLimit: true } });
              await tx.user.update({
                where: { id: userId },
                data: {
                  tier: 'pro',
                  tierExpiresAt: hackathonExpiresAt,
                  serverLimit: Math.max(currentUser?.serverLimit ?? 1, proMaxProjects),
                },
              });
            }

            const transaction = await tx.transaction.create({
              data: {
                walletId: wallet.id,
                amount: credits,
                type: 'purchase',
                description: isHackathon ? 'Weekend Hackathon Pass (72h Pro Access)' : `Purchased ${credits} credits`,
                razorpayOrderId: orderId,
                razorpayPaymentId: paymentId,
              },
            });

            return { wallet: updatedWallet, transaction, duplicate: false };
          });
        } catch (txErr: any) {
          if (txErr?.code === 'P2002') {
            return res.json({ status: 'ok' });
          }
          throw txErr;
        }

        if (result && !result.duplicate) {
          // Send confirmation email asynchronously
          try {
            const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, username: true } });
            if (user && user.email) {
              if (isHackathon) {
                sendHackathonPassActivatedEmail(user.email, {
                  expiresAt: hackathonExpiresAt,
                  username: user.username,
                }).catch(() => {});
              } else {
                sendPaymentConfirmationEmail(user.email, {
                  credits,
                  amountInr: resolvePackageAmountInr(credits, orderAmountPaise),
                  newBalance: result.wallet.balance,
                  transactionId: result.transaction.id,
                }).catch(() => {});
              }
            }
          } catch (e) {}

          logger.info(`Webhook: ${credits} credits added for user ${userId} (Hackathon: ${isHackathon})`);
        }
      }
    }

    return res.json({ status: 'ok' });
  } catch (error) {
    logger.error({ error }, 'Razorpay webhook error');
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};

router.post('/razorpay/webhook', handleRazorpayWebhook);

// Backward-compatibility aliases
router.post('/purchase', requireAuth, handleCreateRazorpayOrder);
router.post('/verify', requireAuth, handleVerifyRazorpayPayment);
router.post('/webhook', handleRazorpayWebhook);

const SLOT_UNLOCK_COST = 25;

router.post('/unlock-slot', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const result = await prisma.$transaction(async (tx: any) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        const err: any = new Error(`Insufficient credits. Unlocking +1 server slot requires ${SLOT_UNLOCK_COST} credits.`);
        err.statusCode = 402;
        err.balance = 0;
        throw err;
      }

      const debit = await tx.wallet.updateMany({
        where: { id: wallet.id, balance: { gte: SLOT_UNLOCK_COST } },
        data: { balance: { decrement: SLOT_UNLOCK_COST } },
      });
      if (debit.count === 0) {
        const err: any = new Error(`Insufficient credits. Unlocking +1 server slot requires ${SLOT_UNLOCK_COST} credits.`);
        err.statusCode = 402;
        err.balance = wallet.balance;
        throw err;
      }

      const updatedWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { serverLimit: { increment: 1 } },
        select: { serverLimit: true },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: -SLOT_UNLOCK_COST,
          type: 'slot_unlock',
          description: `Unlocked +1 server slot (new limit: ${updatedUser.serverLimit})`,
        },
      });

      return { serverLimit: updatedUser.serverLimit, balance: updatedWallet.balance };
    });

    logger.info(`User ${userId} unlocked +1 server slot (new limit: ${result.serverLimit})`);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode === 402) {
      return res.status(402).json({
        error: error.message,
        required: SLOT_UNLOCK_COST,
        balance: error.balance ?? 0,
      });
    }
    logger.error({ error }, 'Unlock server slot error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/transactions/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { wallet: { include: { user: { select: { email: true, name: true, username: true } } } } }
    });

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    if (transaction.wallet.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    res.json({ transaction });
  } catch (error) {
    logger.error({ error }, 'Get transaction error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
