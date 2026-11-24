import express from 'express';
import cors from 'cors';
import { prisma } from '@codehost/database';
import { logger } from '@codehost/logger';
import { requireAuth, AuthRequest } from './middleware/auth.js';
import { RESOURCE_TIERS, CREDIT_PACKAGES, CREDIT_PRICE_USD, CREDIT_PRICE_INR, env } from '@codehost/config';
import {
  getRazorpayClient,
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from './services/razorpay.js';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

// All routes except webhook require auth
app.get('/wallet', requireAuth, async (req: AuthRequest, res) => {
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

app.get('/transactions', requireAuth, async (req: AuthRequest, res) => {
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

app.get('/tiers', requireAuth, async (_req: AuthRequest, res) => {
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

const handleCreateOrder = async (req: AuthRequest, res: any) => {
  try {
    const { credits, amount: rawAmount, currency = 'INR', receipt: customReceipt, planType } = req.body;
    let amountInPaise = 0;
    const notes: Record<string, string> = {};

    if (req.user) {
      notes.userId = req.user.id;
    }

    if (planType === 'hackathon') {
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
    return res.status(500).json({ error: error.message || 'Failed to create order' });
  }
};

const handleVerifyPayment = async (req: AuthRequest, res: any) => {
  try {
    const orderId = req.body.razorpay_order_id || req.body.razorpayOrderId;
    const paymentId = req.body.razorpay_payment_id || req.body.razorpayPaymentId;
    const signature = req.body.razorpay_signature || req.body.razorpaySignature;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        error: 'Missing required payment verification fields (order_id, payment_id, signature)',
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const isValid = verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid payment signature. Verification failed.',
      });
    }

    const userId = req.user.id;
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

    let orderData: any;
    try {
      const client = getRazorpayClient();
      orderData = await client.orders.fetch(orderId);
    } catch (fetchErr) {
      logger.error({ fetchErr, orderId }, 'Failed to fetch order from Razorpay during verification');
      return res.status(502).json({ error: 'Failed to verify payment with Razorpay. Please retry in a few seconds.' });
    }

    const notes = orderData?.notes && typeof orderData.notes === 'object' ? orderData.notes : {};
    if (notes.userId && String(notes.userId) !== userId) {
      return res.status(403).json({ error: 'Order belongs to a different account' });
    }

    const orderAmountPaise = Number(orderData?.amount) || 0;
    let isHackathon = false;
    let creditsToAdd = 0;

    if (notes.planType === 'hackathon' && orderAmountPaise >= 4900) {
      isHackathon = true;
      creditsToAdd = 50;
    } else if (notes.credits !== undefined) {
      const parsed = parseInt(String(notes.credits), 10);
      if (!isNaN(parsed) && parsed > 0) {
        creditsToAdd = parsed;
      }
    }

    if (!creditsToAdd || isNaN(creditsToAdd)) {
      const paidInr = orderAmountPaise / 100;
      creditsToAdd = Math.max(10, Math.floor(paidInr / CREDIT_PRICE_INR));
    }

    const hackathonExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const proMaxProjects = RESOURCE_TIERS.pro?.maxProjects || 5;

    const result = await prisma.$transaction(async (tx: any) => {
      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.wallet.create({ data: { userId } });
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: creditsToAdd } },
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
          amount: creditsToAdd,
          type: 'purchase',
          description: isHackathon ? 'Weekend Hackathon Pass (72h Pro Access)' : `Purchased ${creditsToAdd} credits`,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
        },
      });

      return { wallet: updatedWallet, transaction };
    });

    return res.json({
      success: true,
      message: isHackathon
        ? 'Weekend Hackathon Pass activated successfully! Pro features unlocked for 72 hours.'
        : 'Payment verified and credits added successfully',
      balance: result.wallet.balance,
      transaction: result.transaction,
      hackathon: isHackathon,
    });
  } catch (error: any) {
    logger.error({ error }, 'Payment verify error');
    return res.status(500).json({ error: error.message || 'Payment verification failed' });
  }
};

app.post('/razorpay/create-order', requireAuth, handleCreateOrder);
app.post('/create-order', requireAuth, handleCreateOrder);
app.post('/purchase', requireAuth, handleCreateOrder);

app.post('/razorpay/verify', requireAuth, handleVerifyPayment);
app.post('/verify-payment', requireAuth, handleVerifyPayment);
app.post('/verify', requireAuth, handleVerifyPayment);

// Webhook Handler
app.post('/webhook', async (req: any, res: any) => {
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

      if (userId && credits && paymentId) {
        const existing = await prisma.transaction.findFirst({
          where: { razorpayPaymentId: paymentId },
        });

        if (!existing) {
          await prisma.$transaction(async (tx: any) => {
            let wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) {
              wallet = await tx.wallet.create({ data: { userId } });
            }

            await tx.wallet.update({
              where: { id: wallet.id },
              data: { balance: { increment: credits } },
            });

            await tx.transaction.create({
              data: {
                walletId: wallet.id,
                amount: credits,
                type: 'purchase',
                description: `Purchased ${credits} credits`,
                razorpayOrderId: orderId,
                razorpayPaymentId: paymentId,
              },
            });
          });
          logger.info(`Webhook: ${credits} credits added for user ${userId}`);
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    logger.error({ error }, 'Webhook error');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

const port = process.env.PORT || 4001;
app.listen(port, () => {
  logger.info(`Billing service listening on port ${port}`);
});
