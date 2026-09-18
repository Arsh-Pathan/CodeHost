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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return res.json({ transactions: [], total: 0 });
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
      if (isNaN(parsed) || parsed < 100) {
        return res.status(400).json({ error: 'Minimum amount is 100 paise (1 INR)' });
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
    const credits = req.body.credits ? Number(req.body.credits) : undefined;
    const requestedPlanType = req.body.planType;

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
      // Idempotency check
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

      // Securely read credits and planType from order details or fallback
      let creditsToAdd = 0;
      let isHackathon = requestedPlanType === 'hackathon';
      try {
        const client = getRazorpayClient();
        const orderData = await client.orders.fetch(orderId);
        if (orderData && orderData.notes) {
          if (orderData.notes.credits) {
            creditsToAdd = parseInt(String(orderData.notes.credits), 10);
          }
          if (orderData.notes.planType === 'hackathon') {
            isHackathon = true;
          }
        }
      } catch (fetchErr) {
        // Fetch failed, use request credits
      }

      if (!creditsToAdd || isNaN(creditsToAdd)) {
        creditsToAdd = credits ? Math.max(10, Number(credits)) : 100;
      }

      const hackathonExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

      const result = await prisma.$transaction(async (tx: any) => {
        let wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) {
          wallet = await tx.wallet.create({ data: { userId } });
        }

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: creditsToAdd } },
        });

        // If Hackathon Pass, upgrade user to pro for 72 hours
        if (isHackathon) {
          await tx.user.update({
            where: { id: userId },
            data: {
              tier: 'pro',
              tierExpiresAt: hackathonExpiresAt,
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

        return { wallet: updatedWallet, transaction };
      });

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
              amountInr: Math.round(creditsToAdd * CREDIT_PRICE_INR),
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
router.post('/create-order', handleCreateRazorpayOrder);
router.post('/razorpay/verify', requireAuth, handleVerifyRazorpayPayment);
router.post('/verify-payment', handleVerifyRazorpayPayment);

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
      const notes = payment?.notes || order?.notes || {};
      const userId = notes.userId;
      const credits = parseInt(notes.credits) || 0;
      const isHackathon = notes.planType === 'hackathon';

      if (userId && credits && paymentId) {
        const existing = await prisma.transaction.findFirst({
          where: { razorpayPaymentId: paymentId },
        });

        if (!existing) {
          const hackathonExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

          const result = await prisma.$transaction(async (tx: any) => {
            let wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) {
              wallet = await tx.wallet.create({ data: { userId } });
            }

            const updatedWallet = await tx.wallet.update({
              where: { id: wallet.id },
              data: { balance: { increment: credits } },
            });

            if (isHackathon) {
              await tx.user.update({
                where: { id: userId },
                data: {
                  tier: 'pro',
                  tierExpiresAt: hackathonExpiresAt,
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

            return { wallet: updatedWallet, transaction };
          });

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
                  amountInr: Math.round(credits * CREDIT_PRICE_INR),
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
