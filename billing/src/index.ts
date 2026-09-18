import express from 'express';
import cors from 'cors';
import { prisma } from '@codehost/database';
import { logger } from '@codehost/logger';
import { requireAuth, AuthRequest } from './middleware/auth.js';
import { RESOURCE_TIERS, CREDIT_PACKAGES, CREDIT_PRICE_USD, CREDIT_PRICE_INR, env } from '@codehost/config';
import {
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
    const { credits, amount: rawAmount, currency = 'INR', receipt: customReceipt } = req.body;
    let amountInPaise = 0;
    const notes: Record<string, string> = {};

    if (req.user) {
      notes.userId = req.user.id;
    }

    if (credits) {
      const pkg = CREDIT_PACKAGES.find((p) => p.credits === credits);
      if (!pkg) {
        return res.status(400).json({ error: 'Invalid credit package' });
      }
      amountInPaise = Math.round(pkg.priceInr * 100);
      notes.credits = String(pkg.credits);
    } else if (rawAmount !== undefined) {
      const parsed = Number(rawAmount);
      if (isNaN(parsed) || parsed < 100) {
        return res.status(400).json({ error: 'Minimum amount is 100 paise (1 INR)' });
      }
      amountInPaise = Math.round(parsed);
    } else {
      return res.status(400).json({ error: 'Amount or credits package is required' });
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

const handleVerifyPayment = async (req: AuthRequest, res: any) => {
  try {
    const orderId = req.body.razorpay_order_id || req.body.razorpayOrderId;
    const paymentId = req.body.razorpay_payment_id || req.body.razorpayPaymentId;
    const signature = req.body.razorpay_signature || req.body.razorpaySignature;
    const credits = req.body.credits ? Number(req.body.credits) : undefined;

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
      return res.status(400).json({
        error: 'Invalid payment signature. Verification failed.',
      });
    }

    if (req.user?.id) {
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

      const creditsToAdd = credits || 100;

      const result = await prisma.$transaction(async (tx: any) => {
        let wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) {
          wallet = await tx.wallet.create({ data: { userId } });
        }

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: creditsToAdd } },
        });

        const transaction = await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: creditsToAdd,
            type: 'purchase',
            description: `Purchased ${creditsToAdd} credits via Razorpay`,
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
          },
        });

        return { wallet: updatedWallet, transaction };
      });

      return res.json({
        success: true,
        message: 'Payment verified and credits added successfully',
        balance: result.wallet.balance,
        transaction: result.transaction,
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

app.post('/razorpay/create-order', requireAuth, handleCreateOrder);
app.post('/create-order', handleCreateOrder);
app.post('/purchase', requireAuth, handleCreateOrder);

app.post('/razorpay/verify', requireAuth, handleVerifyPayment);
app.post('/verify-payment', handleVerifyPayment);
app.post('/verify', requireAuth, handleVerifyPayment);

// Webhook
app.post('/webhook', async (req: any, res) => {
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
                description: `Webhook: Purchased ${credits} credits via Razorpay`,
                razorpayOrderId: orderId,
                razorpayPaymentId: paymentId,
              },
            });
          });
          logger.info(`Webhook: ${credits} credits added for user ${userId} via Razorpay`);
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
