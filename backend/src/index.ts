import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { env } from '@codehost/config';
import { logger } from '@codehost/logger';
import { prisma } from '@codehost/database';
import { redis } from '@codehost/redis';
import { setSocketServer } from './lib/socket-registry.js';
import { getLiveUserAuthState, isJtiRevoked } from './middleware/auth.js';

const app = express();
app.disable('x-powered-by');

const rawTrustProxy = env.TRUST_PROXY?.trim();
if (rawTrustProxy === 'false') {
  app.set('trust proxy', false);
} else if (rawTrustProxy && /^\d+$/.test(rawTrustProxy)) {
  app.set('trust proxy', parseInt(rawTrustProxy, 10));
} else if (rawTrustProxy) {
  app.set('trust proxy', rawTrustProxy);
} else {
  app.set('trust proxy', 1);
}

const httpServer = createServer(app);

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

const corsOriginValidator = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (!origin) return callback(null, true);
  const normalized = origin.replace(/\/$/, '');
  if (allowedOrigins.has(normalized)) {
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
setSocketServer(io);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(cors({ origin: corsOriginValidator, credentials: true }));
app.use(express.json({
  limit: '5mb',
  verify: (req: any, _res, buf) => {
    if (req.originalUrl?.includes('/webhook')) {
      req.rawBody = buf;
    }
  }
}));

// Maintenance mode enforcement middleware (skipped during unit tests and on exempt auth/admin/health/webhook routes)
app.use(async (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();
  const exemptPrefixes = [
    '/health',
    '/auth',
    '/admin',
    '/stats/public',
    '/billing/webhook',
    '/billing/razorpay/webhook',
    '/api/webhook',
    '/api/razorpay/webhook',
  ];
  if (exemptPrefixes.some((p) => req.path === p || req.path.startsWith(`${p}/`))) {
    return next();
  }
  try {
    const maintenance = await redis.get('system:maintenance');
    if (maintenance === 'true') {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const decoded = jwt.verify(authHeader.split(' ')[1], env.JWT_SECRET, {
            algorithms: ['HS256'],
          }) as { id?: string; tv?: number; jti?: string };
          if (decoded?.id && !(await isJtiRevoked(decoded.jti))) {
            const liveUser = await getLiveUserAuthState(decoded.id);
            if (
              liveUser &&
              liveUser.role === 'ADMIN' &&
              liveUser.emailVerified &&
              (typeof decoded.tv !== 'number' || decoded.tv === liveUser.tokenVersion)
            ) {
              return next();
            }
          }
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

let publicStatsCache: { value: number; expiresAt: number } | null = null;
let healthCache: { ok: boolean; payload: Record<string, string>; expiresAt: number } | null = null;

// Public Stats (for landing page, cached 30s)
app.get('/stats/public', async (_req, res) => {
  const now = Date.now();
  if (publicStatsCache && publicStatsCache.expiresAt > now) {
    return res.json({ runningServers: publicStatsCache.value });
  }
  try {
    const runningServers = await prisma.project.count({
      where: { status: 'running' }
    });
    const total = runningServers + 48;
    publicStatsCache = { value: total, expiresAt: now + 30_000 };
    res.json({ runningServers: total });
  } catch {
    res.json({ runningServers: publicStatsCache?.value ?? 48 });
  }
});

// Health Check (cached 2s to shield DB/Redis from probe floods)
app.get('/health', async (_req, res) => {
  const now = Date.now();
  if (healthCache && healthCache.expiresAt > now) {
    return res.status(healthCache.ok ? 200 : 500).json(healthCache.payload);
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    const payload = { status: 'healthy', database: 'ok', redis: 'ok' };
    healthCache = { ok: true, payload, expiresAt: now + 2_000 };
    res.json(payload);
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    const payload = { status: 'unhealthy' };
    healthCache = { ok: false, payload, expiresAt: now + 1_000 };
    res.status(500).json(payload);
  }
});

// WebSocket Authentication & Configuration (verified live against DB & revocation store)
io.use(async (socket, next) => {
  try {
    const authToken = socket.handshake.auth?.token;
    const headerToken = socket.handshake.headers.authorization?.startsWith('Bearer ')
      ? socket.handshake.headers.authorization.split(' ')[1]
      : undefined;
    const token = authToken || headerToken;

    if (!token) {
      return next(new Error('Unauthorized'));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as {
      id: string;
      role?: string;
      scope?: string;
      typ?: string;
      tv?: number;
      jti?: string;
    };
    if (!decoded?.id || decoded.scope === 'mcp' || decoded.typ === 'refresh') {
      return next(new Error('Invalid token'));
    }

    if (await isJtiRevoked(decoded.jti)) {
      return next(new Error('Session revoked'));
    }

    const liveUser = await getLiveUserAuthState(decoded.id);
    if (!liveUser) {
      return next(new Error('Unauthorized'));
    }
    if (typeof decoded.tv === 'number' && decoded.tv !== liveUser.tokenVersion) {
      return next(new Error('Session expired'));
    }

    socket.data.userId = liveUser.id;
    socket.data.role = liveUser.role === 'ADMIN' && liveUser.emailVerified ? 'ADMIN' : 'USER';
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
      const [project, liveUser] = await Promise.all([
        prisma.project.findUnique({
          where: { id: projectId },
          select: { userId: true },
        }),
        getLiveUserAuthState(socket.data.userId),
      ]);
      const isLiveAdmin = Boolean(liveUser && liveUser.role === 'ADMIN' && liveUser.emailVerified);
      if (!liveUser || !project || (project.userId !== liveUser.id && !isLiveAdmin)) {
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

  socket.on('leave-project-logs', (projectId: string) => {
    if (projectId && typeof projectId === 'string') {
      socket.leave(`project:${projectId}`);
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
  const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
  return res.status(status).json({ error: status < 500 && err?.message ? err.message : 'Internal server error' });
});

const PORT = env.PORT || 4000;
let statsInterval: NodeJS.Timeout | null = null;
let isPollingStats = false;

if (process.env.NODE_ENV !== 'test') {
  // Resource Monitoring Loop (only polls currently running subscribed projects in bounded batches)
  statsInterval = setInterval(async () => {
    if (isPollingStats) return;
    isPollingStats = true;
    try {
      const subscribedIds: string[] = [];
      for (const [room] of io.sockets.adapter.rooms) {
        if (room.startsWith('project:')) {
          const projectId = room.slice('project:'.length);
          if (projectId) subscribedIds.push(projectId);
        }
      }
      if (subscribedIds.length === 0) return;

      const runningProjects = await prisma.project.findMany({
        where: { id: { in: subscribedIds }, status: 'running' },
        select: { id: true },
      });

      const activeIds = runningProjects.map((p) => p.id);
      for (let i = 0; i < activeIds.length; i += 5) {
        const batch = activeIds.slice(i, i + 5);
        await Promise.allSettled(
          batch.map(async (projectId) => {
            const stats = await RunnerService.getStats(projectId);
            if (stats) {
              io.to(`project:${projectId}`).emit('stats', stats);
            }
          })
        );
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
