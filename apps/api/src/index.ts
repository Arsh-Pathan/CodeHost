import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { env } from '@codehost/config';
import { logger } from '@codehost/logger';
import { prisma } from '@codehost/database';
import { redis } from '@codehost/redis';

const app = express();
app.set('trust proxy', 1); // Trust Nginx/Cloudflare
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json());

// Routes
import authRouter from './routes/auth.js';
import oauthRouter from './routes/oauth.js';
import projectsRouter from './routes/projects.js';
import deploymentsRouter from './routes/deployments.js';
import adminRouter from './routes/admin.js';
import filesRouter from './routes/files.js';
import billingRouter from './routes/billing.js';
import { RunnerService } from './services/runner.js';
import { RESOURCE_TIERS } from './config/tiers.js';
app.use('/auth', authRouter);
app.use('/auth/oauth', oauthRouter);
app.use('/projects', projectsRouter);
app.use('/deployments', deploymentsRouter);
app.use('/admin', adminRouter);
app.use('/files', filesRouter);
app.use('/billing', billingRouter);

// Public Stats (for landing page)
app.get('/stats/public', async (req, res) => {
  try {
    const runningServers = await prisma.project.count({
      where: { status: 'running' }
    });
    // Add a small "seed" number to make it look like a growing platform
    res.json({ runningServers: runningServers + 48 }); 
  } catch (error) {
    res.json({ runningServers: 48 });
  }
});

// Health Check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({ status: 'healthy', database: 'ok', redis: 'ok' });
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    res.status(500).json({ status: 'unhealthy', error: String(error) });
  }
});

// WebSocket Configuration
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('join-project-logs', (projectId) => {
    socket.join(`project:${projectId}`);
    logger.info(`Client ${socket.id} joined logs for ${projectId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Resource Monitoring Loop
setInterval(async () => {
  const rooms = io.sockets.adapter.rooms;
  for (const [room, _] of rooms) {
    if (room.startsWith('project:')) {
      const projectId = room.split(':')[1];
      try {
        const stats = await RunnerService.getStats(projectId);
        if (stats) {
          io.to(room).emit('stats', stats);
        }
      } catch (err) {
        // Silent
      }
    }
  }
}, 5000);

// Billing cron: check every 24h for monthly tier charges
setInterval(async () => {
  try {
    const paidProjects = await prisma.project.findMany({
      where: { tier: { not: 'free' }, status: 'running' },
      include: { user: true },
    });

    for (const project of paidProjects) {
      const tierConfig = RESOURCE_TIERS[project.tier];
      if (!tierConfig || tierConfig.creditsPerMonth === 0) continue;

      const wallet = await prisma.wallet.findUnique({ where: { userId: project.userId } });
      if (!wallet) continue;

      // Check last tier_charge for this project
      const lastCharge = await prisma.transaction.findFirst({
        where: { walletId: wallet.id, type: 'tier_charge', projectId: project.id },
        orderBy: { createdAt: 'desc' },
      });

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (lastCharge && lastCharge.createdAt > thirtyDaysAgo) continue;

      // Deduct credits
      if (wallet.balance >= tierConfig.creditsPerMonth) {
        await prisma.$transaction(async (tx) => {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { decrement: tierConfig.creditsPerMonth } },
          });
          await tx.transaction.create({
            data: {
              walletId: wallet.id,
              amount: -tierConfig.creditsPerMonth,
              type: 'tier_charge',
              description: `Monthly charge for ${project.name} (${tierConfig.label} tier)`,
              projectId: project.id,
            },
          });
        });
        logger.info(`Charged ${tierConfig.creditsPerMonth} credits for project ${project.id}`);
      } else {
        // Insufficient balance: stop container
        try {
          await RunnerService.stopContainer(project.id);
          await prisma.project.update({
            where: { id: project.id },
            data: { status: 'stopped' },
          });
          logger.info(`Stopped project ${project.id} due to insufficient credits`);
        } catch (err) {
          logger.error({ error: err }, `Failed to stop project ${project.id} for billing`);
        }
      }
    }
  } catch (error) {
    logger.error({ error }, 'Billing cron error');
  }
}, 24 * 60 * 60 * 1000);

const PORT = env.PORT || 4000;

httpServer.listen(PORT, () => {
  logger.info(`API Service running on port ${PORT}`);
});
