import { Router } from 'express';
import os from 'os';
import fs from 'fs';
import { prisma } from '@codehost/database';
import { docker } from '@codehost/docker';
import { redis } from '@codehost/redis';
import { RESOURCE_TIERS, CREDIT_PRICE_INR } from '@codehost/config';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { logger } from '@codehost/logger';
import { RunnerService } from '../services/runner.js';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

// In-memory rolling metrics buffer (last 25 data points for live charts)
interface MetricSample {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
}

const metricsHistory: MetricSample[] = [];

// Pre-seed buffer with smooth initial points
const initialMem = parseFloat((((os.totalmem() - os.freemem()) / os.totalmem()) * 100).toFixed(1));
const initialLoad = Math.min(100, parseFloat(((os.loadavg()[0] / (os.cpus().length || 1)) * 100).toFixed(1)));
for (let i = 10; i >= 1; i--) {
  const t = new Date(Date.now() - i * 10000);
  const timeStr = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}:${t.getSeconds().toString().padStart(2, '0')}`;
  metricsHistory.push({
    timestamp: timeStr,
    cpu: Math.max(2, Math.min(95, parseFloat((initialLoad + (Math.sin(i) * 3)).toFixed(1)))),
    memory: parseFloat((initialMem + (Math.cos(i) * 1.5)).toFixed(1)),
    disk: 25,
  });
}

let prevCpuSample: { idle: number; total: number } | null = null;

function getCpuUsage(): number {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += (cpu.times as any)[type];
    }
    idle += cpu.times.idle;
  }

  if (prevCpuSample) {
    const deltaIdle = idle - prevCpuSample.idle;
    const deltaTotal = total - prevCpuSample.total;
    prevCpuSample = { idle, total };
    if (deltaTotal > 0) {
      const usage = ((deltaTotal - deltaIdle) / deltaTotal) * 100;
      return Math.min(100, Math.max(0, parseFloat(usage.toFixed(1))));
    }
  }

  prevCpuSample = { idle, total };
  const load = os.loadavg()[0];
  const count = cpus.length || 1;
  return Math.min(100, Math.max(0, parseFloat(((load / count) * 100).toFixed(1))));
}

async function getDiskUsage() {
  try {
    const rootPath = process.platform === 'win32' ? process.cwd() : '/';
    const stats = await fs.promises.statfs(rootPath);
    const total = stats.blocks * stats.bsize;
    const free = stats.bavail * stats.bsize;
    const used = total - free;
    const percent = total > 0 ? parseFloat(((used / total) * 100).toFixed(1)) : 0;
    return {
      totalBytes: total,
      freeBytes: free,
      usedBytes: used,
      percent,
      totalGb: (total / (1024 ** 3)).toFixed(1),
      freeGb: (free / (1024 ** 3)).toFixed(1),
      usedGb: (used / (1024 ** 3)).toFixed(1),
    };
  } catch (e: any) {
    return {
      totalBytes: 0,
      freeBytes: 0,
      usedBytes: 0,
      percent: 0,
      totalGb: '0',
      freeGb: '0',
      usedGb: '0',
      error: e.message,
    };
  }
}

// Dashboard metrics
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const [userCount, projectCount, deploymentCount] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.deployment.count()
    ]);

    const activeContainers = await prisma.project.count({
      where: { status: 'running' }
    });

    res.json({
      users: userCount,
      projects: projectCount,
      deployments: deploymentCount,
      activeContainers
    });
  } catch (error) {
    logger.error({ error }, 'Admin stats error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// System health check
router.get('/health', async (req: AuthRequest, res) => {
  try {
    const health: Record<string, { status: string; message: string }> = {};

    // Database
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.database = { status: 'healthy', message: 'Connected' };
    } catch {
      health.database = { status: 'unhealthy', message: 'Connection failed' };
    }

    // Redis
    try {
      await redis.ping();
      health.redis = { status: 'healthy', message: 'Connected' };
    } catch {
      health.redis = { status: 'unhealthy', message: 'Connection failed' };
    }

    // Docker
    try {
      await docker.ping();
      health.docker = { status: 'healthy', message: 'Docker daemon running' };
    } catch {
      health.docker = { status: 'unhealthy', message: 'Docker not available' };
    }

    res.json({ health });
  } catch (error) {
    logger.error({ error }, 'Admin health error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all projects with user info
router.get('/projects', async (req: AuthRequest, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        user: {
          select: { email: true, username: true }
        },
        _count: {
          select: { deployments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ projects });
  } catch (error) {
    logger.error({ error }, 'Admin projects error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Kill a project's container
router.post('/projects/:id/kill', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    await RunnerService.stopContainer(project.id);
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'stopped' }
    });

    logger.info(`Admin ${req.user!.email} killed container for project ${project.id}`);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Admin kill container error');
    res.status(500).json({ error: 'Failed to kill container' });
  }
});

// Delete a project (admin override - any project)
router.delete('/projects/:id', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    try {
      await RunnerService.stopContainer(project.id);
    } catch { /* ignore */ }

    await prisma.deployment.deleteMany({ where: { projectId: project.id } });
    await prisma.project.delete({ where: { id: project.id } });

    logger.info(`Admin ${req.user!.email} deleted project ${project.id}`);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Admin delete project error');
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Change project tier (capacity)
router.put('/projects/:id/tier', async (req: AuthRequest, res) => {
  try {
    const { tier } = req.body;
    if (!tier || !['free', 'basic', 'pro', 'business'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier. Must be free, basic, pro, or business' });
    }

    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { tier }
    });

    if (project.status === 'running') {
      try {
        await RunnerService.stopContainer(project.id);
        await prisma.project.update({ where: { id: project.id }, data: { status: 'stopped' } });
      } catch (e) {}
    }

    logger.info(`Admin ${req.user!.email} changed tier of project ${project.id} to ${tier}`);
    res.json({ project: updated });
  } catch (error) {
    logger.error({ error }, 'Admin tier update error');
    res.status(500).json({ error: 'Failed to update project tier' });
  }
});

// List all users
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        serverLimit: true,
        emailVerified: true,
        provider: true,
        createdAt: true,
        wallet: { select: { balance: true } },
        _count: {
          select: { projects: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ users });
  } catch (error) {
    logger.error({ error }, 'Admin users error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Promote/Demote user role
router.put('/users/:id/role', async (req: AuthRequest, res) => {
  try {
    const { role } = req.body;
    if (!role || !['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be USER or ADMIN' });
    }

    // Prevent demoting yourself
    if (req.params.id === req.user!.id && role !== 'ADMIN') {
      return res.status(400).json({ error: 'Cannot demote yourself' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, username: true, role: true }
    });

    logger.info(`Admin ${req.user!.email} changed role of ${updated.email} to ${role}`);
    res.json({ user: updated });
  } catch (error) {
    logger.error({ error }, 'Admin role update error');
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Delete user
router.delete('/users/:id', async (req: AuthRequest, res) => {
  try {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { projects: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Stop and clean up all user's containers/projects
    for (const project of user.projects) {
      try { await RunnerService.stopContainer(project.id); } catch { /* ignore */ }
      await prisma.deployment.deleteMany({ where: { projectId: project.id } });
    }
    await prisma.project.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });

    logger.info(`Admin ${req.user!.email} deleted user ${user.email}`);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Admin delete user error');
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Update user server limit
router.put('/users/:id/limit', async (req: AuthRequest, res) => {
  try {
    const { serverLimit } = req.body;
    if (typeof serverLimit !== 'number' || serverLimit < 0) {
      return res.status(400).json({ error: 'Invalid server limit' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { serverLimit },
      select: { id: true, email: true, username: true, role: true, serverLimit: true }
    });

    logger.info(`Admin ${req.user!.email} updated server limit for ${updated.email} to ${serverLimit}`);
    res.json({ user: updated });
  } catch (error) {
    logger.error({ error }, 'Admin update limit error');
    res.status(500).json({ error: 'Failed to update server limit' });
  }
});

import bcrypt from 'bcryptjs';

// Create a new user from Admin Panel
router.post('/users', async (req: AuthRequest, res) => {
  try {
    const { email, username, password, serverLimit, role } = req.body;
    
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username: username.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email or username already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        username: username.toLowerCase(),
        password: hashedPassword,
        serverLimit: typeof serverLimit === 'number' ? serverLimit : 1,
        role: role === 'ADMIN' ? 'ADMIN' : 'USER',
        emailVerified: true, // Auto-verify admin created users
      }
    });

    logger.info(`Admin ${req.user!.email} manually created user ${newUser.email}`);
    res.json({ success: true, user: { id: newUser.id, email: newUser.email, username: newUser.username } });
  } catch (error) {
    logger.error({ error }, 'Admin create user error');
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Run Docker Prune
router.post('/system/prune', async (req: AuthRequest, res) => {
  try {
    await docker.pruneContainers({ filters: { until: ['24h'] } });
    await docker.pruneImages({ filters: { dangling: ['true'] } });
    await docker.pruneNetworks();
    logger.info(`Admin ${req.user!.email} ran system prune`);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Admin prune error');
    res.status(500).json({ error: 'Failed to prune system' });
  }
});

// Toggle Maintenance Mode (using Redis as state store)
router.post('/system/maintenance', async (req: AuthRequest, res) => {
  try {
    const { enabled } = req.body;
    if (enabled) {
      await redis.set('system:maintenance', 'true');
    } else {
      await redis.del('system:maintenance');
    }
    logger.info(`Admin ${req.user!.email} set maintenance mode to ${enabled}`);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Admin maintenance mode error');
    res.status(500).json({ error: 'Failed to toggle maintenance mode' });
  }
});

// Grant credits to a user
router.post('/users/:id/credits', async (req: AuthRequest, res) => {
  try {
    const { amount, description } = req.body;
    if (typeof amount !== 'number') {
      return res.status(400).json({ error: 'Amount is required and must be a number' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      wallet = await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });
    }

    const newWallet = await prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { id: wallet!.id },
        data: { balance: { increment: amount } }
      });
      
      await tx.transaction.create({
        data: {
          walletId: wallet!.id,
          amount,
          type: 'admin_grant',
          description: description || 'Admin manual adjustment'
        }
      });
      return updated;
    });

    logger.info(`Admin ${req.user!.email} granted ${amount} credits to user ${user.email}`);
    res.json({ wallet: newWallet });
  } catch (error) {
    logger.error({ error }, 'Admin grant credits error');
    res.status(500).json({ error: 'Failed to grant credits' });
  }
});

// Real-time System Telemetry & Metrics (CPU, RAM, Storage, Docker)
router.get('/system/metrics', async (req: AuthRequest, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = parseFloat(((usedMem / totalMem) * 100).toFixed(1));
    const cpuPercent = getCpuUsage();
    const disk = await getDiskUsage();

    // Record sample in rolling history
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    metricsHistory.push({
      timestamp: timeStr,
      cpu: cpuPercent,
      memory: memPercent,
      disk: disk.percent,
    });
    if (metricsHistory.length > 25) {
      metricsHistory.shift();
    }

    // Docker Info
    const dockerInfo = await docker.info().catch(() => null);

    res.json({
      cpu: {
        percent: cpuPercent,
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Standard CPU',
        loadAvg: os.loadavg().map((l) => parseFloat(l.toFixed(2))),
      },
      memory: {
        percent: memPercent,
        totalBytes: totalMem,
        usedBytes: usedMem,
        freeBytes: freeMem,
        totalGb: (totalMem / (1024 ** 3)).toFixed(1),
        usedGb: (usedMem / (1024 ** 3)).toFixed(1),
        freeGb: (freeMem / (1024 ** 3)).toFixed(1),
      },
      disk,
      docker: {
        containersTotal: dockerInfo?.Containers ?? 0,
        containersRunning: dockerInfo?.ContainersRunning ?? 0,
        containersStopped: dockerInfo?.ContainersStopped ?? 0,
        imagesTotal: dockerInfo?.Images ?? 0,
        serverVersion: dockerInfo?.ServerVersion ?? 'N/A',
        memTotalGb: dockerInfo?.MemTotal ? (dockerInfo.MemTotal / (1024 ** 3)).toFixed(1) : '0',
      },
      host: {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptimeSeconds: os.uptime(),
        nodeVersion: process.version,
      },
      history: metricsHistory,
    });
  } catch (error) {
    logger.error({ error }, 'Admin system metrics error');
    res.status(500).json({ error: 'Failed to collect system metrics' });
  }
});

// Financial & Revenue Analytics
router.get('/revenue/analytics', async (req: AuthRequest, res) => {
  try {
    const creditRate = CREDIT_PRICE_INR || 1;

    // 1. Transactions breakdown
    const allPurchases = await prisma.transaction.findMany({
      where: { type: 'purchase' },
      select: { amount: true, createdAt: true }
    });

    const totalRevenueCredits = allPurchases.reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalRevenueInr = totalRevenueCredits * creditRate;

    // 2. Active users & tiers
    const [users, projects, wallets] = await Promise.all([
      prisma.user.findMany({ select: { id: true, tier: true, createdAt: true } }),
      prisma.project.findMany({ select: { id: true, tier: true, status: true } }),
      prisma.wallet.findMany({ select: { balance: true } }),
    ]);

    const tierPricesInr: Record<string, number> = {
      free: 0,
      basic: (RESOURCE_TIERS.basic?.creditsPerMonth || 249) * creditRate,
      pro: (RESOURCE_TIERS.pro?.creditsPerMonth || 499) * creditRate,
      business: (RESOURCE_TIERS.business?.creditsPerMonth || 999) * creditRate,
    };

    let estimatedMrr = 0;
    const tierBreakdown: Record<string, { users: number; projects: number; revenueInr: number }> = {
      free: { users: 0, projects: 0, revenueInr: 0 },
      basic: { users: 0, projects: 0, revenueInr: 0 },
      pro: { users: 0, projects: 0, revenueInr: 0 },
      business: { users: 0, projects: 0, revenueInr: 0 },
    };

    for (const u of users) {
      const t = (u.tier && tierBreakdown[u.tier]) ? u.tier : 'free';
      tierBreakdown[t].users++;
      if (t !== 'free') {
        estimatedMrr += tierPricesInr[t] || 0;
        tierBreakdown[t].revenueInr += tierPricesInr[t] || 0;
      }
    }

    for (const p of projects) {
      const t = (p.tier && tierBreakdown[p.tier]) ? p.tier : 'free';
      tierBreakdown[t].projects++;
    }

    const totalUsers = users.length || 1;
    const paidUsers = users.filter((u) => u.tier && u.tier !== 'free').length;
    const conversionRate = parseFloat(((paidUsers / totalUsers) * 100).toFixed(1));
    const arpu = parseFloat((totalRevenueInr / totalUsers).toFixed(1));

    // 3. 30-Day Daily Revenue Trend
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentPurchases = allPurchases.filter((p) => new Date(p.createdAt) >= thirtyDaysAgo);

    const trendMap = new Map<string, { revenue: number; orders: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      trendMap.set(key, { revenue: 0, orders: 0 });
    }

    for (const p of recentPurchases) {
      const key = new Date(p.createdAt).toISOString().split('T')[0];
      if (trendMap.has(key)) {
        const entry = trendMap.get(key)!;
        entry.revenue += (p.amount || 0) * creditRate;
        entry.orders += 1;
      }
    }

    const revenueTrend = Array.from(trendMap.entries()).map(([date, data]) => ({
      date: date.slice(5), // MM-DD
      revenue: data.revenue,
      orders: data.orders,
    }));

    // 4. Wallet Float
    const totalWalletFloatCredits = wallets.reduce((acc, w) => acc + (w.balance || 0), 0);
    const totalWalletFloatInr = totalWalletFloatCredits * creditRate;

    // 5. Recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      take: 12,
      orderBy: { createdAt: 'desc' },
      include: {
        wallet: {
          include: {
            user: {
              select: { id: true, email: true, username: true, role: true, tier: true }
            }
          }
        }
      }
    });

    res.json({
      summary: {
        totalRevenueInr,
        totalRevenueCredits,
        estimatedMrr,
        arpu,
        paidUsers,
        totalUsers: users.length,
        conversionRate,
        totalWalletFloatInr,
        totalWalletFloatCredits,
      },
      revenueTrend,
      tierBreakdown,
      recentTransactions,
    });
  } catch (error) {
    logger.error({ error }, 'Admin revenue analytics error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Full Transactions Ledger with pagination & search
router.get('/revenue/transactions', async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const typeFilter = typeof req.query.type === 'string' ? req.query.type.trim() : '';

    const whereClause: any = {};
    if (typeFilter) {
      whereClause.type = typeFilter;
    }
    if (search) {
      whereClause.OR = [
        { razorpayPaymentId: { contains: search, mode: 'insensitive' } },
        { razorpayOrderId: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          wallet: {
            user: {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } },
              ]
            }
          }
        }
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          wallet: {
            include: {
              user: {
                select: { id: true, email: true, username: true, tier: true }
              }
            }
          }
        }
      }),
      prisma.transaction.count({ where: whereClause })
    ]);

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error({ error }, 'Admin transactions error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Restart project container
router.post('/projects/:id/restart', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    await RunnerService.restartContainer(project.id);
    logger.info(`Admin ${req.user!.email} restarted container for project ${project.id}`);
    res.json({ success: true, message: `Container ${project.name} restarted successfully` });
  } catch (error: any) {
    logger.error({ error }, 'Admin restart container error');
    res.status(500).json({ error: error.message || 'Failed to restart container' });
  }
});

// Start stopped project container
router.post('/projects/:id/start', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    await RunnerService.startExistingContainer(project.id);
    logger.info(`Admin ${req.user!.email} started container for project ${project.id}`);
    res.json({ success: true, message: `Container ${project.name} started successfully` });
  } catch (error: any) {
    logger.error({ error }, 'Admin start container error');
    res.status(500).json({ error: error.message || 'Failed to start container' });
  }
});

// Get recent container logs
router.get('/projects/:id/logs', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const tail = parseInt(req.query.tail as string) || 150;
    const logs = await RunnerService.getLogs(project.id, tail);
    res.json({ logs, projectName: project.name, status: project.status });
  } catch (error: any) {
    logger.error({ error }, 'Admin get logs error');
    res.status(500).json({ error: 'Failed to retrieve container logs' });
  }
});

// Update user subscription tier
router.put('/users/:id/tier', async (req: AuthRequest, res) => {
  try {
    const { tier, durationDays } = req.body;
    if (!tier || !['free', 'basic', 'pro', 'business'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier. Must be free, basic, pro, or business' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let tierExpiresAt: Date | null = null;
    if (typeof durationDays === 'number' && durationDays > 0) {
      tierExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { tier, tierExpiresAt },
      select: { id: true, email: true, username: true, role: true, tier: true, tierExpiresAt: true }
    });

    logger.info(`Admin ${req.user!.email} updated tier of user ${user.email} to ${tier}`);
    res.json({ user: updated });
  } catch (error) {
    logger.error({ error }, 'Admin user tier update error');
    res.status(500).json({ error: 'Failed to update user tier' });
  }
});

// Flush Redis cache
router.post('/system/flush-redis', async (req: AuthRequest, res) => {
  try {
    await redis.flushall();
    logger.info(`Admin ${req.user!.email} flushed Redis cache`);
    res.json({ success: true, message: 'Redis cache flushed successfully' });
  } catch (error: any) {
    logger.error({ error }, 'Admin flush redis error');
    res.status(500).json({ error: 'Failed to flush Redis cache' });
  }
});

// Clear expired sessions
router.post('/system/clear-sessions', async (req: AuthRequest, res) => {
  try {
    const deleted = await prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    logger.info(`Admin ${req.user!.email} purged ${deleted.count} expired sessions`);
    res.json({ success: true, count: deleted.count, message: `Purged ${deleted.count} expired sessions` });
  } catch (error: any) {
    logger.error({ error }, 'Admin clear sessions error');
    res.status(500).json({ error: 'Failed to clear expired sessions' });
  }
});

export default router;
