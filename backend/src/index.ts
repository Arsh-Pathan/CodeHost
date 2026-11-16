import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
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
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

// Routes
import authRouter from './routes/auth.js';
import oauthRouter from './routes/oauth.js';
import projectsRouter from './routes/projects.js';
import deploymentsRouter from './routes/deployments.js';
import adminRouter from './routes/admin.js';
import filesRouter from './routes/files.js';
import billingRouter from './routes/billing.js';
import referralsRouter from './routes/referrals.js';
import certificatesRouter from './routes/certificates.js';
import { RunnerService } from './services/runner.js';
import { startLifecycleJobs } from './services/lifecycle.js';
app.use('/auth', authRouter);
app.use('/auth/oauth', oauthRouter);
app.use('/projects', projectsRouter);
app.use('/deployments', deploymentsRouter);
app.use('/admin', adminRouter);
app.use('/files', filesRouter);
app.use('/billing', billingRouter);
app.use('/api', billingRouter);
app.use('/referrals', referralsRouter);
app.use('/certificates', certificatesRouter);

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

// WebSocket Authentication & Configuration
io.use((socket, next) => {
  try {
    const authToken = socket.handshake.auth?.token;
    const headerToken = socket.handshake.headers.authorization?.startsWith('Bearer ')
      ? socket.handshake.headers.authorization.split(' ')[1]
      : undefined;
    const token = authToken || headerToken;

    if (!token) {
      return next(new Error('Unauthorized'));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; role?: string };
    if (!decoded?.id) {
      return next(new Error('Invalid token'));
    }

    socket.data.userId = decoded.id;
    socket.data.role = decoded.role || 'USER';
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id} (user: ${socket.data.userId})`);
  
  socket.on('join-project-logs', async (projectId: string) => {
    if (!projectId || typeof projectId !== 'string') return;
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true },
      });
      if (!project || (project.userId !== socket.data.userId && socket.data.role !== 'ADMIN')) {
        socket.emit('log', {
          type: 'error',
          message: 'Unauthorized to view logs for this project.',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      socket.join(`project:${projectId}`);
      logger.info(`Client ${socket.id} joined logs for ${projectId}`);
    } catch {
      // Ignore transient lookup errors
    }
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

// Start background lifecycle, idle hibernation, storage quota, and hourly billing jobs
startLifecycleJobs();

const PORT = env.PORT || 4000;

httpServer.listen(PORT, () => {
  logger.info(`API Service running on port ${PORT}`);
});

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  io.close();
  httpServer.close(async () => {
    await Promise.allSettled([
      prisma.$disconnect(),
      redis.quit(),
    ]);
    logger.info('Graceful shutdown complete');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
