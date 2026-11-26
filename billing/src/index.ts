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
const domainHost = env.DOMAIN || 'code-host.online';
const allowedOrigins = new Set<string>(
  [
    env.APP_URL,
    `https://${domainHost}`,
    `https://www.${domainHost}`,
    ...(env.NODE_ENV !== 'production' ? ['http://localhost:3000', 'http://127.0.0.1:3000'] : []),
  ]
    .filter(Boolean)
    .map((o) => String(o).replace(/\/$/, ''))
);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const clean = origin.replace(/\/$/, '');
      if (allowedOrigins.has(clean)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({
  limit: '1mb',
  verify: (req: any, _res, buf) => {
    if (req.originalUrl?.includes('/webhook')) {
      req.rawBody = buf;
    }
  }
}));

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', service: 'billing' });
  } catch {
    res.status(500).json({ status: 'unhealthy', service: 'billing' });
  }
});

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

function resolveOrderGrant(
  orderData: { amount?: number | string | null; currency?: string | null; notes?: Record<string, unknown> | null } | null | undefined,
  requestingUserId: string
) {
  if (!orderData) {
    return { ok: false, status: 400, error: 'Order not found', creditsToAdd: 0, orderAmountPaise: 0, isHackathon: false };
  }
  if (orderData.currency !== undefined && orderData.currency !== null && String(orderData.currency).toUpperCase() !== 'INR') {
    return { ok: false, status: 400, error: 'Unsupported order currency. Only INR orders are accepted.', creditsToAdd: 0, orderAmountPaise: 0, isHackathon: false };
  }
  const notes = orderData.notes && typeof orderData.notes === 'object' ? orderData.notes : {};
  if (!notes.userId || String(notes.userId) !== requestingUserId) {
    return { ok: false, status: 403, error: 'Order belongs to a different account', creditsToAdd: 0, orderAmountPaise: 0, isHackathon: false };
  }

  const orderAmountPaise = Number(orderData.amount) || 0;
  let isHackathon = false;
  let creditsToAdd = 0;

  if (notes.planType === 'hackathon' && orderAmountPaise >= 4900) {
    isHackathon = true;
    creditsToAdd = 50;
  } else {
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

const handleCreateOrder = async (req: AuthRequest, res: any) => {
  try {
    const { credits, amount: rawAmount, currency: rawCurrency, receipt: customReceipt, planType } = req.body;
    if (rawCurrency !== undefined && String(rawCurrency).trim().toUpperCase() !== 'INR') {
      return res.status(400).json({ error: 'Only INR currency is supported' });
    }
    const currency = 'INR';

    let amountInPaise = 0;
    const notes: Record<string, string> = {};

    if (req.user) {
      notes.userId = req.user.id;
    }

    if (planType === 'hackathon') {
      if (req.user?.id) {
        const currentUser = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { tier: true, tierExpiresAt: true },
        });
        if (
          currentUser &&
          (currentUser.tier === 'pro' || currentUser.tier === 'business') &&
          (!currentUser.tierExpiresAt || currentUser.tierExpiresAt > new Date())
        ) {
          return res.status(400).json({ error: 'Your account already has an active Pro/Business plan or Hackathon Pass.' });
        }
      }
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

    const grant = resolveOrderGrant(orderData, userId);
    if (!grant.ok) {
      return res.status(grant.status || 400).json({ error: grant.error });
    }
    const { creditsToAdd, isHackathon } = grant;
    const proMaxProjects = RESOURCE_TIERS.pro?.maxProjects || 5;

    let result: { wallet: any; transaction: any; duplicate?: boolean };
    try {
      result = await prisma.$transaction(async (tx: any) => {
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

        if (isHackathon) {
          const currentUser = await tx.user.findUnique({
            where: { id: userId },
            select: { tier: true, tierExpiresAt: true, serverLimit: true },
          });
          const hasPermanentPaidTier =
            currentUser &&
            (currentUser.tier === 'pro' || currentUser.tier === 'business') &&
            !currentUser.tierExpiresAt;
          if (!hasPermanentPaidTier) {
            const baseMs = Math.max(Date.now(), currentUser?.tierExpiresAt?.getTime() || 0);
            await tx.user.update({
              where: { id: userId },
              data: {
                tier: currentUser?.tier === 'business' ? 'business' : 'pro',
                tierExpiresAt: new Date(baseMs + 72 * 60 * 60 * 1000),
                serverLimit: Math.max(currentUser?.serverLimit ?? 1, proMaxProjects),
              },
            });
          }
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
app.post('/razorpay/verify-payment', requireAuth, handleVerifyPayment);
app.post('/verify-payment', requireAuth, handleVerifyPayment);
app.post('/verify', requireAuth, handleVerifyPayment);

// Webhook Handler
const handleWebhook = async (req: any, res: any) => {
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
      const paymentCurrency = String(payment?.currency || order?.currency || 'INR').toUpperCase();

      if (paymentCurrency !== 'INR') {
        return res.json({ status: 'ignored' });
      }

      if (paymentId && orderId) {
        let verifiedOrder: any;
        try {
          verifiedOrder = await getRazorpayClient().orders.fetch(orderId);
        } catch (fetchErr) {
          logger.error({ fetchErr, paymentId, orderId }, 'Billing webhook failed to fetch Razorpay order');
          return res.status(500).json({ error: 'Temporary Razorpay fetch failure' });
        }

        const userId = verifiedOrder?.notes?.userId ? String(verifiedOrder.notes.userId) : '';
        if (!userId) {
          return res.json({ status: 'ignored' });
        }

        const grant = resolveOrderGrant(verifiedOrder, userId);
        if (!grant.ok) {
          return res.json({ status: 'ignored' });
        }
        const { creditsToAdd: credits, isHackathon } = grant;
        const proMaxProjects = RESOURCE_TIERS.pro?.maxProjects || 5;

        try {
          await prisma.$transaction(async (tx: any) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${String(paymentId)}))`;

            const existing = await tx.transaction.findFirst({
              where: { razorpayPaymentId: paymentId },
            });
            if (existing) return;

            let wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) {
              wallet = await tx.wallet.create({ data: { userId } });
            }

            await tx.wallet.update({
              where: { id: wallet.id },
              data: { balance: { increment: credits } },
            });

            if (isHackathon) {
              const currentUser = await tx.user.findUnique({
                where: { id: userId },
                select: { tier: true, tierExpiresAt: true, serverLimit: true },
              });
              const hasPermanentPaidTier =
                currentUser &&
                (currentUser.tier === 'pro' || currentUser.tier === 'business') &&
                !currentUser.tierExpiresAt;
              if (!hasPermanentPaidTier) {
                const baseMs = Math.max(Date.now(), currentUser?.tierExpiresAt?.getTime() || 0);
                await tx.user.update({
                  where: { id: userId },
                  data: {
                    tier: currentUser?.tier === 'business' ? 'business' : 'pro',
                    tierExpiresAt: new Date(baseMs + 72 * 60 * 60 * 1000),
                    serverLimit: Math.max(currentUser?.serverLimit ?? 1, proMaxProjects),
                  },
                });
              }
            }

            await tx.transaction.create({
              data: {
                walletId: wallet.id,
                amount: credits,
                type: 'purchase',
                description: isHackathon ? 'Weekend Hackathon Pass (72h Pro Access)' : `Purchased ${credits} credits`,
                razorpayOrderId: orderId,
                razorpayPaymentId: paymentId,
              },
            });
          });
        } catch (txErr: any) {
          if (txErr?.code !== 'P2002') throw txErr;
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    logger.error({ error }, 'Webhook error');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

app.post('/razorpay/webhook', handleWebhook);
app.post('/webhook', handleWebhook);

const SLOT_UNLOCK_COST = 25;

app.post('/unlock-slot', requireAuth, async (req: AuthRequest, res) => {
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
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: -SLOT_UNLOCK_COST,
          type: 'slot_unlock',
          description: 'Unlocked +1 additional server slot',
        },
      });

      const [userRow, slotCount, paidProjects] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, select: { role: true, tier: true, tierExpiresAt: true, serverLimit: true } }),
        tx.transaction.count({ where: { wallet: { userId }, type: 'slot_unlock' } }),
        tx.project.findMany({ where: { userId }, select: { tier: true } }),
      ]);
      const freeMax = RESOURCE_TIERS.free?.maxProjects || 1;
      const effectiveTier =
        userRow?.tier && userRow.tier !== 'free' && (!userRow.tierExpiresAt || userRow.tierExpiresAt > new Date())
          ? userRow.tier
          : 'free';
      const userTierMax = RESOURCE_TIERS[effectiveTier]?.maxProjects || freeMax;
      const projectTierMax = paidProjects.reduce(
        (m: number, p: { tier: string }) => Math.max(m, RESOURCE_TIERS[p.tier]?.maxProjects || freeMax),
        freeMax
      );
      const nextLimit = userRow?.role === 'ADMIN'
        ? Math.max(100, userRow.serverLimit)
        : Math.max(1, Math.max(userTierMax, projectTierMax) + slotCount);
      await tx.user.update({ where: { id: userId }, data: { serverLimit: nextLimit } });

      return { serverLimit: nextLimit, balance: updatedWallet.balance };
    });

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

app.get('/transactions/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { wallet: { include: { user: { select: { email: true, name: true, username: true } } } } },
    });

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    if (transaction.wallet.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    res.json({ transaction });
  } catch (error) {
    logger.error({ error }, 'Get transaction error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

const port = process.env.PORT || 4001;
const server = app.listen(port, () => {
  logger.info(`Billing service listening on port ${port}`);
});

const shutdownBilling = (signal: string) => {
  logger.info(`Billing received ${signal}, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdownBilling('SIGTERM'));
process.on('SIGINT', () => shutdownBilling('SIGINT'));
