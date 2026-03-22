import { Router } from 'express';
import { prisma } from '@codehost/database';
import { logger } from '@codehost/logger';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { RESOURCE_TIERS, CREDIT_PACKAGES, CREDIT_PRICE_INR } from '../config/tiers.js';
import { createOrder, verifySignature, verifyWebhookSignature } from '../services/razorpay.js';
import express from 'express';

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
    priceInr: t.creditsPerMonth * CREDIT_PRICE_INR,
  }));
  res.json({ tiers, creditPackages: CREDIT_PACKAGES, creditPriceInr: CREDIT_PRICE_INR });
});

router.post('/purchase', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { credits } = req.body;
    const pkg = CREDIT_PACKAGES.find((p) => p.credits === credits);
    if (!pkg) {
      return res.status(400).json({ error: 'Invalid credit package' });
    }

    const order = await createOrder(pkg.priceInr * 100, `wallet-${req.user!.id}`, {
      userId: req.user!.id,
      credits: String(pkg.credits),
    });

    res.json({ orderId: order.id, amount: pkg.priceInr * 100, currency: 'INR', credits: pkg.credits });
  } catch (error) {
    logger.error({ error }, 'Purchase error');
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

router.post('/verify', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const isValid = verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Check idempotency
    const existing = await prisma.transaction.findFirst({
      where: { razorpayPaymentId },
    });
    if (existing) {
      return res.json({ success: true, message: 'Payment already processed' });
    }

    // Find the credit amount from order notes
    const pkg = CREDIT_PACKAGES.find((p) => p.priceInr * 100 === req.body.amount) || CREDIT_PACKAGES[0];
    const creditAmount = req.body.credits || pkg.credits;

    const userId = req.user!.id;

    await prisma.$transaction(async (tx) => {
      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.wallet.create({ data: { userId } });
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: creditAmount } },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: creditAmount,
          type: 'purchase',
          description: `Purchased ${creditAmount} credits`,
          razorpayOrderId,
          razorpayPaymentId,
        },
      });
    });

    logger.info(`Credits purchased: ${creditAmount} by user ${userId}`);
    res.json({ success: true, credits: creditAmount });
  } catch (error) {
    logger.error({ error }, 'Verify payment error');
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Webhook — no auth, raw body, signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = req.body.toString();

    if (!signature || !verifyWebhookSignature(body, signature)) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(body);

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const notes = payment.notes || {};
      const userId = notes.userId;
      const credits = parseInt(notes.credits) || 0;

      if (!userId || !credits) {
        return res.json({ status: 'ok', message: 'Missing notes' });
      }

      // Idempotency check
      const existing = await prisma.transaction.findFirst({
        where: { razorpayPaymentId: paymentId },
      });
      if (existing) {
        return res.json({ status: 'ok', message: 'Already processed' });
      }

      await prisma.$transaction(async (tx) => {
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
            description: `Webhook: Purchased ${credits} credits`,
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
          },
        });
      });

      logger.info(`Webhook: Credits ${credits} added for user ${userId}`);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    logger.error({ error }, 'Webhook error');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
