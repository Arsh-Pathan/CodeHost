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
import projectsRouter from './routes/projects.js';
import deploymentsRouter from './routes/deployments.js';
import adminRouter from './routes/admin.js';
import filesRouter from './routes/files.js';
import { RunnerService } from './services/runner.js';
app.use('/auth', authRouter);
app.use('/projects', projectsRouter);
app.use('/deployments', deploymentsRouter);
app.use('/admin', adminRouter);
app.use('/files', filesRouter);

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

const PORT = env.PORT || 4000;

httpServer.listen(PORT, () => {
  logger.info(`API Service running on port ${PORT}`);
});
