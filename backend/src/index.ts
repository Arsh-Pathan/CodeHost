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

const domainHost = env.DOMAIN || 'code-host.online';
const allowedOrigins = new Set<string>(
  [
    env.APP_URL,
    `https://${domainHost}`,
    `https://www.${domainHost}`,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]
    .filter(Boolean)
    .map((o) => String(o).replace(/\/$/, ''))
);

const corsOriginValidator = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (!origin) return callback(null, true);
  const normalized = origin.replace(/\/$/, '');
  if (allowedOrigins.has(normalized) || normalized.endsWith(`.${domainHost}`)) {
    return callback(null, true);
  }
  return callback(null, false);
};

export const io = new Server(httpServer, {
  cors: {
    origin: corsOriginValidator,
    credentials: true,
  },
});

app.use(cors({ origin: corsOriginValidator, credentials: true }));
app.use(express.json({
  limit: '5mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

// Maintenance mode enforcement middleware (skipped during unit tests and on exempt auth/admin/health/webhook routes)
app.use(async (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();
  const exemptPrefixes = ['/health', '/auth', '/admin', '/stats/public', '/billing/webhook'];
  if (exemptPrefixes.some((p) => req.path.startsWith(p))) {
    return next();
  }
  try {
    const maintenance = await redis.get('system:maintenance');
    if (maintenance === 'true') {
      // Allow verified ADMIN users through even during maintenance
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const decoded = jwt.verify(authHeader.split(' ')[1], env.JWT_SECRET) as { role?: string };
          if (decoded?.role === 'ADMIN') return next();
        } catch {}
      }
      return res.status(503).json({
        error: 'CodeHost is currently undergoing scheduled maintenance. Please try again shortly.',
        maintenance: true,
      });
    }
  } catch {
    // Fail open if Redis is temporarily unavailable
  }
  next();
});

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
import mcpRouter from './routes/mcp.js';
import { RunnerService } from './services/runner.js';
import { startLifecycleJobs, stopLifecycleJobs } from './services/lifecycle.js';
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
app.use('/mcp', mcpRouter);
app.use('/api/mcp', mcpRouter);

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
    res.status(500).json({ status: 'unhealthy' });
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

    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; role?: string; scope?: string };
    if (!decoded?.id || decoded.scope === 'mcp') {
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

// Global error handler for Multer upload errors & malformed JSON bodies
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Uploaded file exceeds the maximum allowed 50MB limit.' });
  }
  if (err?.name === 'MulterError' || err?.message === 'Only .zip files are allowed') {
    return res.status(400).json({ error: err.message || 'Invalid file upload' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON request body' });
  }
  logger.error({ error: err }, 'Unhandled Express error');
  return res.status(err?.status || 500).json({ error: err?.message || 'Internal server error' });
});

const PORT = env.PORT || 4000;
let statsInterval: NodeJS.Timeout | null = null;
let isPollingStats = false;

if (process.env.NODE_ENV !== 'test') {
  // Resource Monitoring Loop
  statsInterval = setInterval(async () => {
    if (isPollingStats) return;
    isPollingStats = true;
    try {
      const rooms = io.sockets.adapter.rooms;
      for (const [room] of rooms) {
        if (room.startsWith('project:')) {
          const projectId = room.split(':')[1];
          try {
            const stats = await RunnerService.getStats(projectId);
            if (stats) {
              io.to(room).emit('stats', stats);
            }
          } catch {
            // Silent
          }
        }
      }
    } finally {
      isPollingStats = false;
    }
  }, 5000);

  // Start background lifecycle, idle hibernation, storage quota, and hourly billing jobs
  startLifecycleJobs();

  httpServer.listen(PORT, () => {
    logger.info(`API Service running on port ${PORT}`);
  });
}

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
  }
  stopLifecycleJobs();
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
