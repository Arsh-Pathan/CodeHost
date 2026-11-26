import fs from 'fs-extra';
import path from 'path';
import { docker, demuxDockerLogBuffer, createDockerLogDemuxer } from '@codehost/docker';
import { logger } from '@codehost/logger';
import { prisma } from '@codehost/database';
import { env, RESOURCE_TIERS } from '@codehost/config';
import { io } from '../index.js';
import { sendServerStatusEmail } from '../lib/email.js';
import { sanitizeUserEnvVars, validateCustomDomain } from '../lib/validation.js';
import { getEffectiveUserTier } from './billing-guard.js';

/**
 * Parse listening ports from Linux `/proc/net/tcp` and `/proc/net/tcp6` output.
 * Extracts TCP_LISTEN sockets (`st === '0A'`) while skipping IPv4 loopback (`0100007F`) and DNS port 53.
 */
export function parseProcNetTcpPorts(content: string): number[] {
  if (!content) return [];
  const ports = new Set<number>();
  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    const match = trimmed.match(/^\d+:\s+([0-9A-Fa-f]+):([0-9A-Fa-f]{4})\s+[0-9A-Fa-f]+:[0-9A-Fa-f]+\s+([0-9A-Fa-f]{2})/);
    if (!match) continue;
    const [, ipHex, portHex, stateHex] = match;
    if (stateHex.toUpperCase() !== '0A') continue; // 0A = TCP_LISTEN
    if (ipHex.toUpperCase() === '0100007F') continue; // 127.0.0.1 loopback only
    const port = parseInt(portHex, 16);
    if (port > 0 && port <= 65535 && port !== 53) {
      ports.add(port);
    }
  }
  return Array.from(ports);
}

export class RunnerService {
  private static activeLogStreams: Map<string, any> = new Map();

  public static isTrackingProject(projectId: string): boolean {
    return this.activeLogStreams.has(projectId);
  }

  public static async startContainer(projectId: string, deploymentId: string, imageName: string) {
    let logCountInWindow = 0;
    let logWindowStart = Date.now();
    let throttledInWindow = false;

    const emitLog = (message: string, bypassThrottle = false) => {
      const trimmed = message.trim();
      if (!trimmed) return;
      if (!bypassThrottle) {
        const room = io.sockets.adapter.rooms.get(`project:${projectId}`);
        if (!room || room.size === 0) return;

        const now = Date.now();
        if (now - logWindowStart >= 1000) {
          logWindowStart = now;
          logCountInWindow = 0;
          throttledInWindow = false;
        }
        logCountInWindow++;
        if (logCountInWindow > 60) {
          if (!throttledInWindow) {
            throttledInWindow = true;
            io.to(`project:${projectId}`).emit('log', {
              type: 'run',
              message: '[Log rate limit exceeded — throttling burst output]',
              timestamp: new Date().toISOString(),
            });
          }
          return;
        }
      }

      io.to(`project:${projectId}`).emit('log', {
        type: 'run',
        message: trimmed.slice(0, 4096),
        timestamp: new Date().toISOString(),
      });
    };

    let oldImageToPrune: string | null = null;
    try {
      const containerName = `codehost-run-${projectId}`;

      try {
        const existing = docker.getContainer(containerName);
        const info = await existing.inspect().catch(() => null);
        if (info) {
          oldImageToPrune = info.Config?.Image || null;
          if (info.State.Running) {
            await existing.stop();
          }
          await existing.remove({ force: true });
          logger.info(`Removed old container ${containerName}`);
        }
      } catch (e: any) {
        logger.warn(`Failed to remove old container: ${e.message}`);
      }

      emitLog('> Preparing your app...', true);

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { user: true }
      });

      if (!project) {
        throw new Error('Project not found');
      }

      const projectSlug = project.name.toLowerCase();
      const domain = env.DOMAIN || 'code-host.online';
      const host = domain;

      const userEffectiveTier = getEffectiveUserTier(project.user);
      const effectiveTier =
        project.tier === 'free' && userEffectiveTier !== 'free' ? userEffectiveTier : project.tier || 'free';

      const customDomainCheck = validateCustomDomain(project.customDomain, host);
      const validCustomDomain =
        customDomainCheck.valid && customDomainCheck.normalized && effectiveTier !== 'free'
          ? customDomainCheck.normalized
          : null;
      const virtualHosts = `${projectSlug}.${host}${validCustomDomain ? `,${validCustomDomain}` : ''}`;
      const userEnvEntries = Object.entries(sanitizeUserEnvVars(project.envVars)).map(
        ([k, v]) => `${k}=${v}`
      );

      const containerPort = await this.detectPort(projectId, imageName);

      const tierConfig = RESOURCE_TIERS[effectiveTier] || RESOURCE_TIERS['free'];
      const memoryLimit = tierConfig.memory;
      const nanoCpus = tierConfig.cpus * 1e9;

      const hostConfig = {
        PublishAllPorts: false,
        Memory: memoryLimit,
        MemorySwap: memoryLimit,
        NanoCpus: nanoCpus,
        PidsLimit: 128,
        CapDrop: ['ALL'],
        CapAdd: ['CHOWN', 'SETGID', 'SETUID', 'NET_BIND_SERVICE'],
        SecurityOpt: ['no-new-privileges:true'],
        Tmpfs: { '/tmp': 'rw,noexec,nosuid,size=64m' },
        Ulimits: [
          { Name: 'core', Soft: 0, Hard: 0 },
          { Name: 'nofile', Soft: 1024, Hard: 4096 },
        ],
        NetworkMode: 'proxy',
        RestartPolicy: { Name: 'on-failure', MaximumRetryCount: 3 },
        LogConfig: {
          Type: 'json-file',
          Config: { 'max-size': '10m', 'max-file': '3' },
        },
        ...(process.env.ENABLE_DOCKER_STORAGE_OPT === 'true'
          ? { StorageOpt: { size: `${Math.round(tierConfig.storage / (1024 * 1024))}M` } }
          : {}),
      };

      let container = await docker.createContainer({
        Image: imageName,
        name: containerName,
        Env: [
          ...userEnvEntries,
          `VIRTUAL_HOST=${virtualHosts}`,
          `VIRTUAL_PORT=${containerPort}`,
          `LETSENCRYPT_HOST=${virtualHosts}`,
          `LETSENCRYPT_EMAIL=admin@${host}`,
          `VIRTUAL_NETWORK=proxy`,
        ],
        HostConfig: hostConfig,
        Labels: {
          'codehost.project.id': projectId,
          'codehost.deployment.id': deploymentId,
        }
      });

      await container.start();

      // Give the process a moment to bind its port, then verify
      await new Promise(r => setTimeout(r, 1500));

      let actualPort: string | null = null;
      try {
        const exec = await container.exec({
          Cmd: ['sh', '-c', 'netstat -tlnp 2>/dev/null || ss -tlnp 2>/dev/null || cat /proc/net/tcp /proc/net/tcp6 2>/dev/null || true'],
          AttachStdout: true, AttachStderr: true,
        });
        const stream = await exec.start({ hijack: true, stdin: false });
        const output = await new Promise<string>((resolve) => {
          const chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          stream.on('end', () => resolve(demuxDockerLogBuffer(Buffer.concat(chunks))));
          setTimeout(() => resolve(demuxDockerLogBuffer(Buffer.concat(chunks))), 3000);
        });
        const portMatches = output.match(/(?:0\.0\.0\.0|\*|:::|\[::\])[:.](\d+)/g);
        if (portMatches) {
          for (const match of portMatches) {
            const p = match.match(/(\d+)$/)?.[1];
            const parsedPort = p ? parseInt(p, 10) : 0;
            if (p && parsedPort > 0 && parsedPort <= 65535 && parsedPort !== 53) {
              actualPort = p;
              break;
            }
          }
        }
        if (!actualPort) {
          const procPorts = parseProcNetTcpPorts(output);
          if (procPorts.length > 0) {
            actualPort = String(procPorts[0]);
          }
        }
      } catch {}

      // If the actual port differs from what we told the proxy, recreate with correct port
      if (actualPort && actualPort !== containerPort) {
        logger.info(`Port mismatch: proxy port=${containerPort}, actual=${actualPort}. Recreating container...`);
        emitLog(`> Detected app listening on port ${actualPort}, reconfiguring...`, true);

        await container.stop().catch((err: any) => {
          if (err?.statusCode !== 304 && err?.statusCode !== 404) throw err;
        });
        await container.remove({ force: true });

        const fixedContainer = await docker.createContainer({
          Image: imageName,
          name: containerName,
          Env: [
            ...userEnvEntries,
            `VIRTUAL_HOST=${virtualHosts}`,
            `VIRTUAL_PORT=${actualPort}`,
            `LETSENCRYPT_HOST=${virtualHosts}`,
            `LETSENCRYPT_EMAIL=admin@${host}`,
            `VIRTUAL_NETWORK=proxy`,
          ],
          HostConfig: hostConfig,
          Labels: {
            'codehost.project.id': projectId,
            'codehost.deployment.id': deploymentId,
          }
        });
        await fixedContainer.start();
        await new Promise(r => setTimeout(r, 1500));
        container = fixedContainer;
      }

      const containerInfo = await container.inspect();
      if (!containerInfo.State?.Running) {
        let crashOutput = '';
        try {
          const logsBuf = await container.logs({ stdout: true, stderr: true, tail: 50 });
          crashOutput = demuxDockerLogBuffer(logsBuf).trim();
        } catch {}
        if (crashOutput) {
          emitLog(crashOutput, true);
        }
        await container.remove({ force: true }).catch(() => {});
        throw new Error(
          `Container exited during startup (exit code ${containerInfo.State?.ExitCode ?? 'unknown'}). Check runtime logs for errors.`
        );
      }

      // Prune previous deployment image ONLY after the new container is verified running (preserves rollback on startup failure)
      if (
        oldImageToPrune &&
        oldImageToPrune !== imageName &&
        oldImageToPrune.toLowerCase().startsWith(`codehost-project-${projectId.toLowerCase()}:`)
      ) {
        docker.getImage(oldImageToPrune).remove({ force: true })
          .then(() => logger.info(`Pruned old deployment image ${oldImageToPrune}`))
          .catch((err: any) => logger.warn(`Failed to prune old image ${oldImageToPrune}: ${err.message}`));
      }

      let mappedPort: number | null = null;
      if (containerInfo.NetworkSettings.Ports) {
        const keys = Object.keys(containerInfo.NetworkSettings.Ports);
        if (keys.length > 0 && containerInfo.NetworkSettings.Ports[keys[0]]?.[0]?.HostPort) {
          mappedPort = parseInt(containerInfo.NetworkSettings.Ports[keys[0]][0].HostPort, 10);
        }
      }
      mappedPort = mappedPort || (actualPort ? parseInt(actualPort, 10) : parseInt(containerPort, 10) || null);

      emitLog('> Your app is now live!', true);
      logger.info(`Started container ${containerName} (internal: ${actualPort || containerPort})`);

      if (this.activeLogStreams.has(projectId)) {
        try {
          const oldStream = this.activeLogStreams.get(projectId);
          if (oldStream && typeof oldStream.destroy === 'function') {
            oldStream.destroy();
          }
        } catch {}
        this.activeLogStreams.delete(projectId);
      }

      const logStream = await container.logs({
        stdout: true,
        stderr: true,
        follow: true,
        tail: 50,
      });

      this.activeLogStreams.set(projectId, logStream);

      const cleanupStreamRef = () => {
        if (this.activeLogStreams.get(projectId) === logStream) {
          this.activeLogStreams.delete(projectId);
        }
      };
      (logStream as any).on?.('end', cleanupStreamRef);
      (logStream as any).on?.('close', cleanupStreamRef);
      (logStream as any).on?.('error', cleanupStreamRef);

      docker.modem.demuxStream(logStream,
        { write: (chunk: any) => { emitLog(chunk.toString()); return true; } } as any,
        { write: (chunk: any) => {
          const msg = chunk.toString();
          const isError = /error|fatal|exception/i.test(msg);
          emitLog(isError ? `[ERROR] ${msg}` : msg);
          return true;
        } } as any
      );

      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'success' }
      });

      await prisma.project.update({
        where: { id: projectId },
        data: {
          status: 'running',
          containerId: container.id,
          port: mappedPort
        }
      });

      prisma.project.findUnique({
        where: { id: projectId },
        include: { user: { select: { email: true } } }
      }).then((p) => {
        if (p?.user?.email) {
          sendServerStatusEmail(p.user.email, {
            projectName: p.name,
            status: 'running',
            projectId: p.id
          }).catch(() => {});
        }
      }).catch(() => {});

      return { containerId: container.id, port: mappedPort };
    } catch (error: any) {
      emitLog(`> Failed to launch app: ${error.message || 'Unknown error'}`, true);
      logger.error(`Runner failed for project ${projectId}`, error);
      // Clean up failed container & image if different from prior working image
      await docker.getContainer(`codehost-run-${projectId}`).remove({ force: true }).catch(() => {});
      if (imageName && imageName !== oldImageToPrune && imageName.toLowerCase().startsWith(`codehost-project-${projectId.toLowerCase()}:`)) {
        await docker.getImage(imageName).remove({ force: true }).catch(() => {});
      }
      await prisma.project.update({ where: { id: projectId }, data: { status: 'failed', containerId: null } }).catch(() => {});
      await prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'failed' } }).catch(() => {});

      prisma.project.findUnique({
        where: { id: projectId },
        include: { user: { select: { email: true } } }
      }).then((p) => {
        if (p?.user?.email) {
          sendServerStatusEmail(p.user.email, {
            projectName: p.name,
            status: 'failed',
            projectId: p.id
          }).catch(() => {});
        }
      }).catch(() => {});

      throw error;
    }
  }

  /**
   * Detect the actual port an app listens on by scanning source files,
   * then falling back to Docker image metadata.
   */
  private static async detectPort(projectId: string, imageName: string): Promise<string> {
    const sourceDir = path.join(process.cwd(), 'storage', 'projects', projectId, 'source');
    const isValidPort = (p?: string | null): p is string => {
      if (!p) return false;
      const n = parseInt(p, 10);
      return Number.isInteger(n) && n > 0 && n <= 65535;
    };

    // 1. Check Dockerfile for explicit EXPOSE (last one wins in multi-stage)
    try {
      const dockerfile = await fs.readFile(path.join(sourceDir, 'Dockerfile'), 'utf8');
      const exposeMatches = dockerfile.match(/^EXPOSE\s+(\d+)/gm);
      if (exposeMatches && exposeMatches.length > 0) {
        const lastExpose = exposeMatches[exposeMatches.length - 1];
        const port = lastExpose.match(/\d+/)?.[0];
        if (isValidPort(port)) {
          logger.info(`Port ${port} from Dockerfile EXPOSE`);
          return port;
        }
      }
    } catch {}

    // 2. Check for nginx.conf with a custom listen port
    try {
      const files = await fs.readdir(sourceDir);
      for (const file of files) {
        if (file.includes('nginx') && file.endsWith('.conf')) {
          const content = await fs.readFile(path.join(sourceDir, file), 'utf8');
          const listenMatch = content.match(/listen\s+(\d+)/);
          if (listenMatch && isValidPort(listenMatch[1]) && listenMatch[1] !== '80') {
            logger.info(`Port ${listenMatch[1]} from ${file} listen directive`);
            return listenMatch[1];
          }
        }
      }
    } catch {}

    // 3. Check ENV PORT in Dockerfile (e.g. ENV PORT=3000 or ENV PORT="3000")
    try {
      const dockerfile = await fs.readFile(path.join(sourceDir, 'Dockerfile'), 'utf8');
      const envPortMatch = dockerfile.match(/ENV\s+PORT[=\s]+["']?(\d+)["']?/i);
      if (envPortMatch && isValidPort(envPortMatch[1])) {
        logger.info(`Port ${envPortMatch[1]} from Dockerfile ENV PORT`);
        return envPortMatch[1];
      }
    } catch {}

    // 4. Fall back to Docker image ExposedPorts
    try {
      const imageDetail = await docker.getImage(imageName).inspect();
      const exposedPorts = Object.keys(imageDetail.Config?.ExposedPorts || {});
      if (exposedPorts.length > 0) {
        const port = exposedPorts[0].split('/')[0];
        if (isValidPort(port)) {
          logger.info(`Port ${port} from image ExposedPorts`);
          return port;
        }
      }
    } catch {}

    logger.info('No port detected, defaulting to 80');
    return '80';
  }

  public static async getStats(projectId: string) {
    try {
      const containerName = `codehost-run-${projectId}`;
      const container = docker.getContainer(containerName);
      
      const stats = await container.stats({ stream: false });
      
      // Calculate CPU percentage
      // Formula: (cpu_delta / system_delta) * number_of_cpus * 100.0
      const cpuDelta = (stats.cpu_stats?.cpu_usage?.total_usage || 0) - (stats.precpu_stats?.cpu_usage?.total_usage || 0);
      const systemDelta = (stats.cpu_stats?.system_cpu_usage || 0) - (stats.precpu_stats?.system_cpu_usage || 0);
      const onlineCpus = stats.cpu_stats?.online_cpus || stats.cpu_stats?.cpu_usage?.percpu_usage?.length || 1;
      
      let cpuPercent = 0;
      if (systemDelta > 0 && cpuDelta > 0) {
        cpuPercent = (cpuDelta / systemDelta) * onlineCpus * 100.0;
      }

      // Memory usage (subtract reclaimable page cache on cgroup v2 / v1)
      const totalMemUsage = stats.memory_stats?.usage || 0;
      const cacheBytes =
        stats.memory_stats?.stats?.inactive_file ??
        stats.memory_stats?.stats?.cache ??
        0;
      const memUsage = Math.max(0, totalMemUsage - cacheBytes);
      const memLimit = stats.memory_stats?.limit || 0;
      const memPercent = memLimit > 0 ? (memUsage / memLimit) * 100.0 : 0;

      return {
        cpu: parseFloat((Number.isFinite(cpuPercent) ? cpuPercent : 0).toFixed(2)),
        memory: {
          usage: memUsage,
          limit: memLimit,
          percent: parseFloat((Number.isFinite(memPercent) ? memPercent : 0).toFixed(2))
        }
      };
    } catch (e) {
      return null;
    }
  }

  public static async stopContainer(projectId: string) {
    if (this.activeLogStreams.has(projectId)) {
      try {
        const stream = this.activeLogStreams.get(projectId);
        if (stream && typeof stream.destroy === 'function') {
          stream.destroy();
        }
      } catch {}
      this.activeLogStreams.delete(projectId);
    }

    try {
      const containerName = `codehost-run-${projectId}`;
      const container = docker.getContainer(containerName);
      try {
        await container.stop();
      } catch (stopErr: any) {
        // HTTP 304 means container already stopped; 404 means container absent
        if (stopErr?.statusCode !== 304 && stopErr?.statusCode !== 404) {
          throw stopErr;
        }
      }
      try {
        await container.remove({ force: true });
      } catch (rmErr: any) {
        if (rmErr?.statusCode !== 404) {
          throw rmErr;
        }
      }
      logger.info(`Stopped and removed container ${containerName}`);
    } catch (e: any) {
      logger.warn(`Could not stop container for ${projectId}: ${e.message}`);
    }
  }

  public static async restartContainer(projectId: string): Promise<boolean> {
    try {
      const containerName = `codehost-run-${projectId}`;
      const container = docker.getContainer(containerName);
      await container.restart({ t: 10 });
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'running' }
      });
      return true;
    } catch (e: any) {
      logger.error(`Restart container failed for ${projectId}: ${e.message}`);
      throw e;
    }
  }

  public static async startExistingContainer(projectId: string): Promise<boolean> {
    try {
      const containerName = `codehost-run-${projectId}`;
      const container = docker.getContainer(containerName);
      await container.start();
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'running' }
      });
      return true;
    } catch (e: any) {
      logger.error(`Start container failed for ${projectId}: ${e.message}`);
      throw e;
    }
  }

  public static async getLogs(projectId: string, tail: number = 100): Promise<string> {
    try {
      const containerName = `codehost-run-${projectId}`;
      const container = docker.getContainer(containerName);
      const logsBuffer = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
      });
      return demuxDockerLogBuffer(logsBuffer);
    } catch (e: any) {
      return `[System] Could not retrieve container logs: ${e.message}`;
    }
  }
}
