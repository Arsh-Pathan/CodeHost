import { Router } from 'express';
import path from 'path';
import fs from 'fs-extra';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '@codehost/database';
import { docker } from '@codehost/docker';
import { logger } from '@codehost/logger';
import {
  env,
  RESOURCE_TIERS,
  CREDIT_PACKAGES,
  CREDIT_PRICE_INR,
  CREDIT_PRICE_USD,
} from '@codehost/config';
import { generateTokens } from './auth.js';

const router = Router();

const MCP_PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = {
  name: 'codehost-mcp-server',
  version: '1.0.0',
};

const PLATFORM_OVERVIEW_TEXT = [
  '# CodeHost Cloud Platform (MCP Reference)',
  '',
  'CodeHost deploys Next.js, Node.js, Python (FastAPI/Django/Flask), Go, Rust, Java, .NET, PHP, Ruby, and custom Dockerfile applications to isolated Docker containers with automated HTTPS subdomains (`https://<name>.code-host.online`).',
  '',
  '## Typical LLM Deployment Workflow',
  '1. Authenticate using an `Authorization: Bearer <JWT>` header or call `codehost_login`.',
  '2. Call `create_project` with a unique lowercase slug `name` and optional `tier` (`free`, `basic`, `pro`, `business`).',
  '3. Either deploy a public GitHub repo via `deploy_github`, OR write files directly with `write_project_files` followed by `deploy_files`.',
  '4. Monitor progress and container stdout/stderr using `get_project_logs` or `get_project`.',
  '5. Manage container lifecycle (`restart`, `stop`, `redeploy`, `delete`) with `control_project`.',
].join('\n');

export const MCP_TOOLS = [
  {
    name: 'codehost_login',
    description:
      'Authenticate with CodeHost using email or username and password to obtain a JWT access token for subsequent MCP tool calls.',
    inputSchema: {
      type: 'object',
      properties: {
        identifier: { type: 'string', description: 'Account email address or username' },
        password: { type: 'string', description: 'Account password' },
      },
      required: ['identifier', 'password'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_projects',
    description: 'List all cloud projects owned by the authenticated user along with status, tier, and live URL.',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Optional JWT access token if not passed in Authorization header' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_project',
    description: 'Fetch full project configuration, live URL, and the 5 most recent deployments for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'UUID of the project' },
        token: { type: 'string', description: 'Optional JWT access token' },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_project',
    description:
      'Create a new CodeHost project/subdomain. Checks serverLimit and deducts monthly credits atomically if a paid tier is selected.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Unique project subdomain (3-50 lowercase letters, numbers, and hyphens)',
        },
        tier: {
          type: 'string',
          enum: ['free', 'basic', 'pro', 'business'],
          description: 'Compute tier (default: free)',
        },
        buildCommand: { type: 'string', description: 'Optional custom build command override' },
        startCommand: { type: 'string', description: 'Optional custom start command override' },
        envVars: {
          type: 'object',
          description: 'Optional key-value map of environment variables',
          additionalProperties: { type: 'string' },
        },
        token: { type: 'string', description: 'Optional JWT access token' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'deploy_github',
    description: 'Clone and deploy a public GitHub repository into an existing project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'UUID of the target project' },
        repoUrl: { type: 'string', description: 'HTTPS GitHub repository URL (https://github.com/owner/repo)' },
        branch: { type: 'string', description: 'Git branch to deploy (default: main)' },
        subdir: { type: 'string', description: 'Optional repository subdirectory path' },
        token: { type: 'string', description: 'Optional JWT access token' },
      },
      required: ['projectId', 'repoUrl'],
      additionalProperties: false,
    },
  },
  {
    name: 'write_project_files',
    description:
      'Write one or more source code files directly into a project workspace (e.g., package.json, server.js, app.py, Dockerfile) before calling deploy_files.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'UUID of the target project' },
        files: {
          type: 'array',
          description: 'List of relative file paths and UTF-8 contents to write',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Relative path inside project source root' },
              content: { type: 'string', description: 'File text content' },
            },
            required: ['path', 'content'],
            additionalProperties: false,
          },
        },
        token: { type: 'string', description: 'Optional JWT access token' },
      },
      required: ['projectId', 'files'],
      additionalProperties: false,
    },
  },
  {
    name: 'deploy_files',
    description: 'Build and launch a project container from the source files currently stored in its workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'UUID of the target project' },
        token: { type: 'string', description: 'Optional JWT access token' },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_project_logs',
    description: 'Retrieve recent container runtime logs and latest deployment build status/logs for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'UUID of the project' },
        tail: { type: 'number', description: 'Number of log lines to fetch from running container (default: 150, max: 500)' },
        token: { type: 'string', description: 'Optional JWT access token' },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
  },
  {
    name: 'control_project',
    description: 'Perform a lifecycle control action on a project: restart, stop, redeploy, or delete.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'UUID of the project' },
        action: {
          type: 'string',
          enum: ['restart', 'stop', 'redeploy', 'delete'],
          description: 'Lifecycle action to perform',
        },
        token: { type: 'string', description: 'Optional JWT access token' },
      },
      required: ['projectId', 'action'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_wallet_and_tiers',
    description: 'Get the authenticated user wallet credit balance, serverLimit, and all compute tier / credit package pricing.',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Optional JWT access token' },
      },
      additionalProperties: false,
    },
  },
] as const;

export const MCP_RESOURCES = [
  {
    uri: 'codehost://docs/overview',
    name: 'CodeHost Platform Overview',
    description: 'How CodeHost works and recommended LLM deployment workflow.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'codehost://config/tiers',
    name: 'CodeHost Resource Tiers & Pricing',
    description: 'Authoritative JSON definitions of compute tiers and credit packages.',
    mimeType: 'application/json',
  },
] as const;

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, any>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

function toolResult(payload: any, isError = false) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  return {
    content: [{ type: 'text', text }],
    ...(isError ? { isError: true } : {}),
  };
}

function getSourceDir(projectId: string): string {
  return path.join(process.cwd(), 'storage', 'projects', projectId, 'source');
}

function getLiveUrl(project: { name: string; customDomain?: string | null }): string {
  const domain = process.env.DOMAIN || 'code-host.online';
  return `https://${project.name.toLowerCase()}.${domain}`;
}

/**
 * Resolve a relative file path safely inside a project source directory,
 * rejecting path traversal and escaping symlinks.
 */
export async function assertSafeProjectFilePath(baseDir: string, relativePath: string): Promise<string> {
  if (!relativePath || typeof relativePath !== 'string' || relativePath.includes('\0')) {
    throw new Error('Invalid file path');
  }

  const normalizedRel = relativePath.replace(/^[/\\]+/, '');
  if (!normalizedRel) {
    throw new Error('File path cannot be empty');
  }

  const resolvedBase = path.resolve(baseDir);
  const resolvedPath = path.resolve(resolvedBase, normalizedRel);

  if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
    throw new Error('Forbidden path: traversal outside project directory');
  }

  if (await fs.pathExists(resolvedPath)) {
    const realBase = await fs.realpath(resolvedBase).catch(() => resolvedBase);
    const realTarget = await fs.realpath(resolvedPath);
    if (!realTarget.startsWith(realBase + path.sep) && realTarget !== realBase) {
      throw new Error('Forbidden path: symlink escapes project root');
    }
  }

  return resolvedPath;
}

function resolveUserFromAuth(authHeader?: string, argToken?: unknown): { id: string; email: string; role: string } | null {
  let token: string | undefined;

  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (typeof argToken === 'string' && argToken.trim().length > 0) {
    token = argToken.trim();
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id?: string; email?: string; role?: string };
    if (!decoded?.id) return null;
    return { id: decoded.id, email: decoded.email || '', role: decoded.role || 'USER' };
  } catch {
    return null;
  }
}

async function getOwnedProject(projectId: string, userId: string) {
  if (!projectId || typeof projectId !== 'string') return null;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== userId) return null;
  return project;
}

function queueBuildAndStart(projectId: string, deploymentId: string, gitOptions?: { repoUrl: string; branch: string; subdir?: string }) {
  void (async () => {
    try {
      const [{ BuilderService }, { RunnerService }] = await Promise.all([
        import('../services/builder.js'),
        import('../services/runner.js'),
      ]);
      const imageName = await BuilderService.buildProject(deploymentId, projectId, undefined, gitOptions);
      await RunnerService.startContainer(projectId, deploymentId, imageName);
    } catch (err) {
      logger.error({ error: err }, `MCP deploy pipeline failed for ${deploymentId}`);
      await prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'failed' } }).catch(() => {});
      await prisma.project.update({ where: { id: projectId }, data: { status: 'failed' } }).catch(() => {});
    } finally {
      const { releaseDeployLock } = await import('../services/deploy-lock.js');
      await releaseDeployLock(projectId);
    }
  })();
}

const createProjectArgsSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Project name must be 3-50 lowercase letters, numbers, or hyphens'),
  tier: z.enum(['free', 'basic', 'pro', 'business']).default('free'),
  buildCommand: z.string().max(500).optional(),
  startCommand: z.string().max(500).optional(),
  envVars: z.record(z.string()).optional(),
});

const deployGithubArgsSchema = z.object({
  projectId: z.string().min(1),
  repoUrl: z
    .string()
    .url()
    .refine((u) => /^https:\/\/github\.com\/[^/]+\/[^/]+/.test(u), 'Must be a valid GitHub HTTPS URL'),
  branch: z.string().min(1).max(100).default('main'),
  subdir: z.string().max(200).optional(),
});

const writeFilesArgsSchema = z.object({
  projectId: z.string().min(1),
  files: z
    .array(
      z.object({
        path: z.string().min(1).max(300),
        content: z.string().max(2 * 1024 * 1024),
      })
    )
    .min(1)
    .max(50),
});

async function executeToolCall(name: string, args: Record<string, any>, authHeader?: string) {
  if (name === 'codehost_login') {
    const identifier = typeof args?.identifier === 'string' ? args.identifier.trim() : '';
    const password = typeof args?.password === 'string' ? args.password : '';
    if (!identifier || !password) {
      return toolResult({ error: 'identifier and password are required' }, true);
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier.toLowerCase() }],
      },
    });
    if (!user || !user.password) {
      return toolResult({ error: 'Invalid credentials or social-login-only account' }, true);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return toolResult({ error: 'Invalid credentials' }, true);
    }

    const { accessToken, refreshToken } = generateTokens(user);
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    });

    return toolResult({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        tier: user.tier,
        serverLimit: user.serverLimit,
      },
      usageHint: 'Pass this accessToken via `Authorization: Bearer <accessToken>` header or `token` argument.',
    });
  }

  const user = resolveUserFromAuth(authHeader, args?.token);
  if (!user) {
    return toolResult(
      {
        error: 'Authentication required. Pass `Authorization: Bearer <JWT>` header or invoke `codehost_login` first and pass `token`.',
      },
      true
    );
  }

  switch (name) {
    case 'list_projects': {
      const projects = await prisma.project.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      return toolResult({
        count: projects.length,
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          tier: p.tier,
          liveUrl: getLiveUrl(p),
          customDomain: p.customDomain,
          repoUrl: p.repoUrl,
          updatedAt: p.updatedAt,
        })),
      });
    }

    case 'get_project': {
      const projectId = typeof args?.projectId === 'string' ? args.projectId : '';
      const owned = await getOwnedProject(projectId, user.id);
      if (!owned) return toolResult({ error: 'Project not found' }, true);

      const deployments = await prisma.deployment.findMany({
        where: { projectId: owned.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, status: true, source: true, createdAt: true },
      });

      return toolResult({
        project: {
          id: owned.id,
          name: owned.name,
          status: owned.status,
          tier: owned.tier,
          liveUrl: getLiveUrl(owned),
          customDomain: owned.customDomain,
          repoUrl: owned.repoUrl,
          repoBranch: owned.repoBranch,
          repoSubdir: owned.repoSubdir,
          buildCommand: owned.buildCommand,
          startCommand: owned.startCommand,
          envVarKeys: Object.keys((owned.envVars as Record<string, string>) || {}),
          updatedAt: owned.updatedAt,
        },
        recentDeployments: deployments,
      });
    }

    case 'create_project': {
      const parsed = createProjectArgsSchema.safeParse(args || {});
      if (!parsed.success) {
        return toolResult({ error: parsed.error.errors[0]?.message || 'Invalid project arguments' }, true);
      }
      const { name: projName, tier, buildCommand, startCommand, envVars } = parsed.data;
      const tierConfig = RESOURCE_TIERS[tier];

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!dbUser) return toolResult({ error: 'User not found' }, true);

      const currentCount = await prisma.project.count({ where: { userId: user.id } });
      if (currentCount >= dbUser.serverLimit) {
        return toolResult(
          {
            error: `Server limit reached (${dbUser.serverLimit}). Unlock +1 slot for 25 credits or upgrade tier.`,
          },
          true
        );
      }

      const taken = await prisma.project.findFirst({ where: { name: projName } });
      if (taken) {
        return toolResult({ error: `Subdomain "${projName}" is already taken.` }, true);
      }

      try {
        const project = await prisma.$transaction(async (tx) => {
          if (tier !== 'free' && tierConfig.creditsPerMonth > 0) {
            const wallet = await tx.wallet.findUnique({ where: { userId: user.id } });
            if (!wallet || wallet.balance < tierConfig.creditsPerMonth) {
              throw new Error(`INSUFFICIENT_CREDITS:${tierConfig.label} requires ${tierConfig.creditsPerMonth} credits.`);
            }
            await tx.wallet.update({
              where: { id: wallet.id },
              data: { balance: { decrement: tierConfig.creditsPerMonth } },
            });
            await tx.transaction.create({
              data: {
                walletId: wallet.id,
                amount: -tierConfig.creditsPerMonth,
                type: 'tier_charge',
                description: `Initial charge for ${projName} (${tierConfig.label} tier) via MCP`,
              },
            });
            if (tierConfig.maxProjects > dbUser.serverLimit) {
              await tx.user.update({
                where: { id: user.id },
                data: { serverLimit: tierConfig.maxProjects },
              });
            }
          }

          return await tx.project.create({
            data: {
              name: projName,
              userId: user.id,
              status: 'idle',
              tier,
              buildCommand: buildCommand ?? '',
              startCommand: startCommand ?? '',
              envVars: envVars ?? {},
            },
          });
        });

        return toolResult({
          project: {
            id: project.id,
            name: project.name,
            tier: project.tier,
            status: project.status,
            liveUrl: getLiveUrl(project),
          },
          nextStep: 'Call `write_project_files` + `deploy_files`, or `deploy_github` with this projectId.',
        });
      } catch (err: any) {
        const msg = err?.message?.startsWith('INSUFFICIENT_CREDITS:')
          ? err.message.replace('INSUFFICIENT_CREDITS:', '')
          : err?.message || 'Failed to create project';
        return toolResult({ error: msg }, true);
      }
    }

    case 'deploy_github': {
      const parsed = deployGithubArgsSchema.safeParse(args || {});
      if (!parsed.success) {
        return toolResult({ error: parsed.error.errors[0]?.message || 'Invalid GitHub deployment arguments' }, true);
      }
      const { projectId, repoUrl, branch, subdir } = parsed.data;
      const project = await getOwnedProject(projectId, user.id);
      if (!project) return toolResult({ error: 'Project not found' }, true);
      if (project.status === 'building') {
        return toolResult({ error: 'A deployment is already in progress for this project.' }, true);
      }

      const { acquireDeploySlot } = await import('../services/deploy-lock.js');
      const slot = await acquireDeploySlot(projectId, project.tier || 'free');
      if (!slot.ok) return toolResult({ error: slot.error }, true);

      await prisma.project.update({
        where: { id: projectId },
        data: { repoUrl, repoBranch: branch, repoSubdir: subdir || null },
      });

      const deployment = await prisma.deployment.create({
        data: { projectId, status: 'queued', source: 'github' },
      });

      queueBuildAndStart(projectId, deployment.id, { repoUrl, branch, subdir: subdir || undefined });

      return toolResult({
        message: 'GitHub deployment queued',
        deploymentId: deployment.id,
        projectId,
        liveUrl: getLiveUrl(project),
      });
    }

    case 'write_project_files': {
      const parsed = writeFilesArgsSchema.safeParse(args || {});
      if (!parsed.success) {
        return toolResult({ error: parsed.error.errors[0]?.message || 'Invalid file write arguments' }, true);
      }
      const { projectId, files } = parsed.data;
      const project = await getOwnedProject(projectId, user.id);
      if (!project) return toolResult({ error: 'Project not found' }, true);

      const sourceDir = getSourceDir(projectId);
      await fs.ensureDir(sourceDir);

      const written: string[] = [];
      for (const file of files) {
        const targetPath = await assertSafeProjectFilePath(sourceDir, file.path);
        await fs.ensureDir(path.dirname(targetPath));
        await fs.writeFile(targetPath, file.content, 'utf8');
        written.push(file.path);
      }

      return toolResult({
        success: true,
        projectId,
        filesWritten: written,
        nextStep: 'Invoke `deploy_files` with this projectId to build and start the container.',
      });
    }

    case 'deploy_files': {
      const projectId = typeof args?.projectId === 'string' ? args.projectId : '';
      const project = await getOwnedProject(projectId, user.id);
      if (!project) return toolResult({ error: 'Project not found' }, true);
      if (project.status === 'building') {
        return toolResult({ error: 'A deployment is already in progress for this project.' }, true);
      }

      const sourceDir = getSourceDir(projectId);
      if (!(await fs.pathExists(sourceDir))) {
        return toolResult({ error: 'No source files found in workspace. Call `write_project_files` first.' }, true);
      }

      const { acquireDeploySlot } = await import('../services/deploy-lock.js');
      const slot = await acquireDeploySlot(projectId, project.tier || 'free');
      if (!slot.ok) return toolResult({ error: slot.error }, true);

      const deployment = await prisma.deployment.create({
        data: { projectId, status: 'queued', source: 'files' },
      });

      queueBuildAndStart(projectId, deployment.id);

      return toolResult({
        message: 'Deployment queued from workspace files',
        deploymentId: deployment.id,
        projectId,
        liveUrl: getLiveUrl(project),
      });
    }

    case 'get_project_logs': {
      const projectId = typeof args?.projectId === 'string' ? args.projectId : '';
      const project = await getOwnedProject(projectId, user.id);
      if (!project) return toolResult({ error: 'Project not found' }, true);

      const tail = Math.min(500, Math.max(10, Number(args?.tail) || 150));
      let containerLogs = 'Container not running.';

      if (project.containerId) {
        try {
          const container = docker.getContainer(`codehost-run-${project.id}`);
          const logBuffer = await container.logs({
            stdout: true,
            stderr: true,
            tail,
            timestamps: true,
          });
          containerLogs = logBuffer.toString('utf8').replace(/[\x00-\x08]/g, '');
        } catch {
          containerLogs = 'Container not running or unavailable.';
        }
      }

      const latestDeployment = await prisma.deployment.findFirst({
        where: { projectId: project.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, source: true, logs: true, createdAt: true },
      });

      return toolResult({
        projectId: project.id,
        status: project.status,
        liveUrl: getLiveUrl(project),
        containerLogs,
        latestDeployment,
      });
    }

    case 'control_project': {
      const projectId = typeof args?.projectId === 'string' ? args.projectId : '';
      const action = args?.action;
      const project = await getOwnedProject(projectId, user.id);
      if (!project) return toolResult({ error: 'Project not found' }, true);

      if (action === 'stop') {
        const { RunnerService } = await import('../services/runner.js');
        await RunnerService.stopContainer(project.id);
        await prisma.project.update({ where: { id: project.id }, data: { status: 'stopped' } });
        return toolResult({ success: true, projectId: project.id, status: 'stopped' });
      }

      if (action === 'restart') {
        const lastSuccess = await prisma.deployment.findFirst({
          where: { projectId: project.id, status: 'success' },
          orderBy: { createdAt: 'desc' },
        });
        if (!lastSuccess) {
          return toolResult({ error: 'No successful deployment available to restart.' }, true);
        }
        const { RunnerService } = await import('../services/runner.js');
        const imageName = `codehost-project-${project.id}:${lastSuccess.id}`;
        await RunnerService.startContainer(project.id, lastSuccess.id, imageName);
        await prisma.project.update({ where: { id: project.id }, data: { status: 'running' } });
        return toolResult({ success: true, projectId: project.id, status: 'running', liveUrl: getLiveUrl(project) });
      }

      if (action === 'redeploy') {
        if (project.status === 'building') {
          return toolResult({ error: 'A deployment is already in progress for this project.' }, true);
        }
        const { acquireDeploySlot } = await import('../services/deploy-lock.js');
        const slot = await acquireDeploySlot(project.id, project.tier || 'free');
        if (!slot.ok) return toolResult({ error: slot.error }, true);

        const deployment = await prisma.deployment.create({
          data: {
            projectId: project.id,
            status: 'queued',
            source: project.repoUrl ? 'github' : 'files',
          },
        });
        const gitOptions = project.repoUrl
          ? { repoUrl: project.repoUrl, branch: project.repoBranch || 'main', subdir: project.repoSubdir || undefined }
          : undefined;
        queueBuildAndStart(project.id, deployment.id, gitOptions);
        return toolResult({ message: 'Redeploy queued', projectId: project.id, deploymentId: deployment.id });
      }

      if (action === 'delete') {
        const { RunnerService } = await import('../services/runner.js');
        await RunnerService.stopContainer(project.id).catch(() => {});
        await prisma.deployment.deleteMany({ where: { projectId: project.id } });
        await prisma.project.delete({ where: { id: project.id } });
        return toolResult({ success: true, deletedProjectId: project.id });
      }

      return toolResult({ error: 'Unsupported action. Use restart, stop, redeploy, or delete.' }, true);
    }

    case 'get_wallet_and_tiers': {
      const [wallet, dbUser] = await Promise.all([
        prisma.wallet.findUnique({ where: { userId: user.id } }),
        prisma.user.findUnique({ where: { id: user.id }, select: { tier: true, tierExpiresAt: true, serverLimit: true } }),
      ]);

      return toolResult({
        walletBalance: wallet?.balance ?? 0,
        accountTier: dbUser?.tier || 'free',
        tierExpiresAt: dbUser?.tierExpiresAt ?? null,
        serverLimit: dbUser?.serverLimit ?? 1,
        slotUnlockCostCredits: 25,
        creditPriceInr: CREDIT_PRICE_INR,
        creditPriceUsd: CREDIT_PRICE_USD,
        tiers: RESOURCE_TIERS,
        creditPackages: CREDIT_PACKAGES,
      });
    }

    default:
      return toolResult({ error: `Unknown tool: ${name}` }, true);
  }
}

/**
 * Pure JSON-RPC 2.0 dispatcher for the CodeHost MCP Server.
 * Returns null for JSON-RPC notifications (requests without an `id`).
 */
export async function handleMcpJsonRpc(
  body: JsonRpcRequest,
  authHeader?: string
): Promise<JsonRpcResponse | null> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Invalid Request' },
    };
  }

  const hasId = Object.prototype.hasOwnProperty.call(body, 'id') && body.id !== undefined;
  const id: string | number | null = hasId ? (body.id as string | number | null) : null;
  const method = body.method;
  const params = body.params || {};

  if (!method || typeof method !== 'string') {
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32600, message: 'Invalid Request: method is required' },
    };
  }

  if (method === 'notifications/initialized' || (!hasId && method.startsWith('notifications/'))) {
    return null;
  }

  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: typeof params.protocolVersion === 'string' ? params.protocolVersion : MCP_PROTOCOL_VERSION,
            capabilities: {
              tools: {},
              resources: {},
            },
            serverInfo: SERVER_INFO,
            instructions:
              'Use `codehost_login` (or pass Authorization: Bearer <JWT>) to authenticate, then create and deploy projects with `create_project`, `write_project_files` + `deploy_files`, or `deploy_github`.',
          },
        };

      case 'ping':
        return { jsonrpc: '2.0', id, result: {} };

      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } };

      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments && typeof params.arguments === 'object' ? params.arguments : {};
        if (!toolName || typeof toolName !== 'string') {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Invalid params: tool name is required' },
          };
        }
        const result = await executeToolCall(toolName, toolArgs, authHeader);
        return { jsonrpc: '2.0', id, result };
      }

      case 'resources/list':
        return { jsonrpc: '2.0', id, result: { resources: MCP_RESOURCES } };

      case 'resources/read': {
        const uri = params?.uri;
        if (uri === 'codehost://docs/overview') {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              contents: [{ uri, mimeType: 'text/markdown', text: PLATFORM_OVERVIEW_TEXT }],
            },
          };
        }
        if (uri === 'codehost://config/tiers') {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(
                    {
                      creditPriceInr: CREDIT_PRICE_INR,
                      creditPriceUsd: CREDIT_PRICE_USD,
                      tiers: RESOURCE_TIERS,
                      creditPackages: CREDIT_PACKAGES,
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          };
        }
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32002, message: `Resource not found: ${String(uri || '')}` },
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
    }
  } catch (error: any) {
    logger.error({ error, method }, 'MCP JSON-RPC handler error');
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: error?.message || 'Internal error' },
    };
  }
}

router.get('/', (_req, res) => {
  res.json({
    ...SERVER_INFO,
    protocolVersion: MCP_PROTOCOL_VERSION,
    transport: 'streamable-http',
    endpoint: '/mcp',
    authentication: 'Authorization: Bearer <JWT> header or `codehost_login` tool',
    docs: 'https://code-host.online/llms-full.txt',
    tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
    resources: MCP_RESOURCES,
  });
});

router.post('/', async (req, res) => {
  const authHeader = req.headers.authorization;
  const body = req.body;

  if (Array.isArray(body)) {
    if (body.length === 0) {
      return res.status(400).json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Empty batch' } });
    }
    const responses = (await Promise.all(body.map((item) => handleMcpJsonRpc(item, authHeader)))).filter(Boolean);
    if (responses.length === 0) {
      return res.status(202).send();
    }
    return res.json(responses);
  }

  const response = await handleMcpJsonRpc(body, authHeader);
  if (response === null) {
    return res.status(202).send();
  }
  return res.json(response);
});

export default router;
