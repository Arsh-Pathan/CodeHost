import fs from 'fs-extra';
import path from 'path';
import { docker } from '@codehost/docker';
import { logger } from '@codehost/logger';
import { prisma } from '@codehost/database';
import { env } from '@codehost/config';
import { io } from '../index.js';
import { RESOURCE_TIERS } from '../config/tiers.js';

export class RunnerService {
  public static async startContainer(projectId: string, deploymentId: string, imageName: string) {
    const emitLog = (message: string) => {
      io.to(`project:${projectId}`).emit('log', {
        type: 'run',
        message: message.trim(),
        timestamp: new Date().toISOString()
      });
    };

    try {
      const containerName = `codehost-run-${projectId}`;

      try {
        const existing = docker.getContainer(containerName);
        await existing.stop();
        await existing.remove();
        logger.info(`Removed old container ${containerName}`);
      } catch (e) {
      }

      emitLog('> Preparing your app...');

      // Retrieve the running project and user for the routing path
      const project = await prisma.project.findUnique({ 
        where: { id: projectId },
        include: { user: true }
      });
      
      const username = project?.user?.username || project?.user?.email?.split('@')[0].toLowerCase() || 'user';
      const projectSlug = project?.name.toLowerCase() || projectId;
      const domain = process.env.DOMAIN || 'code-host.online';
      const host = domain;

      // Determine the port the app actually listens on.
      // Priority: Dockerfile EXPOSE → nginx.conf listen → image ExposedPorts → default 80
      const containerPort = await this.detectPort(projectId, imageName);

      // Look up tier-based resource limits
      const tierConfig = RESOURCE_TIERS[project?.tier || 'free'] || RESOURCE_TIERS['free'];
      const memoryLimit = tierConfig.memory;
      const nanoCpus = tierConfig.cpus * 1e9;

      let container = await docker.createContainer({
        Image: imageName,
        name: containerName,
        HostConfig: {
          PublishAllPorts: true,
          Memory: memoryLimit,
          MemorySwap: memoryLimit,
          NanoCpus: nanoCpus,
          NetworkMode: 'docker_default', // Connect to the Brain's network
        },
        Labels: {
          'traefik.enable': 'true',

          // 1. Subdomain-based router (New: projectname.code-host.online)
          [`traefik.http.routers.${containerName}-subdomain.rule`]: `Host(\`${projectSlug}.${host}\`)`,
          [`traefik.http.routers.${containerName}-subdomain.priority`]: '200',
          [`traefik.http.routers.${containerName}-subdomain.entrypoints`]: 'web',
          [`traefik.http.routers.${containerName}-subdomain.service`]: containerName,

          // 2. Path-based router (Legacy: host.com/user/project)
          [`traefik.http.routers.${containerName}-path.rule`]: `(Host(\`${host}\`) || Host(\`host.arsh-io.website\`)) && (PathPrefix(\`/${username}/${projectSlug}/\`) || Path(\`/${username}/${projectSlug}\`))`,
          [`traefik.http.routers.${containerName}-path.priority`]: '100',
          [`traefik.http.routers.${containerName}-path.entrypoints`]: 'web',
          [`traefik.http.routers.${containerName}-path.middlewares`]: `${containerName}-slash,${containerName}-strip`,
          [`traefik.http.routers.${containerName}-path.service`]: containerName,
          
          [`traefik.http.services.${containerName}.loadbalancer.server.port`]: containerPort,
          
          // Middlewares for path-based routing
          [`traefik.http.middlewares.${containerName}-strip.stripprefix.prefixes`]: `/${username}/${projectSlug}`,
          [`traefik.http.middlewares.${containerName}-slash.redirectregex.regex`]: `^(https?://[^/]+/${username}/${projectSlug})$`,
          [`traefik.http.middlewares.${containerName}-slash.redirectregex.replacement`]: `$1/`,
        }
      });

      await container.start();

      // Give the process a moment to bind its port, then verify
      await new Promise(r => setTimeout(r, 1500));

      // Check the actual listening port inside the container
      let actualPort: string | null = null;
      try {
        const exec = await container.exec({
          Cmd: ['sh', '-c', 'netstat -tlnp 2>/dev/null || ss -tlnp 2>/dev/null'],
          AttachStdout: true, AttachStderr: true,
        });
        const stream = await exec.start({ hijack: true, stdin: false });
        const output = await new Promise<string>((resolve) => {
          let data = '';
          stream.on('data', (chunk: Buffer) => { data += chunk.toString(); });
          stream.on('end', () => resolve(data));
          setTimeout(() => resolve(data), 3000);
        });
        // Parse listening ports (skip DNS resolver on 127.0.0.11)
        const portMatches = output.match(/(?:0\.0\.0\.0|:::)[:.](\d+)/g);
        if (portMatches) {
          for (const match of portMatches) {
            const p = match.match(/(\d+)$/)?.[1];
            if (p && p !== '53') { // skip DNS
              actualPort = p;
              break;
            }
          }
        }
      } catch {}

      // If the actual port differs from what we told Traefik, recreate with correct port
      if (actualPort && actualPort !== containerPort) {
        logger.info(`Port mismatch: Traefik label=${containerPort}, actual=${actualPort}. Recreating container...`);
        emitLog(`> Detected app listening on port ${actualPort}, reconfiguring...`);

        await container.stop();
        await container.remove();

        // Recreate with correct port
        const fixedContainer = await docker.createContainer({
          Image: imageName,
          name: containerName,
          HostConfig: {
            PublishAllPorts: true,
            Memory: memoryLimit,
            MemorySwap: memoryLimit,
            NanoCpus: nanoCpus,
            NetworkMode: 'docker_default',
          },
          Labels: {
            'traefik.enable': 'true',
            [`traefik.http.routers.${containerName}-subdomain.rule`]: `Host(\`${projectSlug}.${host}\`)`,
            [`traefik.http.routers.${containerName}-subdomain.priority`]: '200',
            [`traefik.http.routers.${containerName}-subdomain.entrypoints`]: 'web',
            [`traefik.http.routers.${containerName}-subdomain.service`]: containerName,
            [`traefik.http.routers.${containerName}-path.rule`]: `(Host(\`${host}\`) || Host(\`host.arsh-io.website\`)) && (PathPrefix(\`/${username}/${projectSlug}/\`) || Path(\`/${username}/${projectSlug}\`))`,
            [`traefik.http.routers.${containerName}-path.priority`]: '100',
            [`traefik.http.routers.${containerName}-path.entrypoints`]: 'web',
            [`traefik.http.routers.${containerName}-path.middlewares`]: `${containerName}-slash,${containerName}-strip`,
            [`traefik.http.routers.${containerName}-path.service`]: containerName,
            [`traefik.http.services.${containerName}.loadbalancer.server.port`]: actualPort,
            [`traefik.http.middlewares.${containerName}-strip.stripprefix.prefixes`]: `/${username}/${projectSlug}`,
            [`traefik.http.middlewares.${containerName}-slash.redirectregex.regex`]: `^(https?://[^/]+/${username}/${projectSlug})$`,
            [`traefik.http.middlewares.${containerName}-slash.redirectregex.replacement`]: `$1/`,
          }
        });
        await fixedContainer.start();
        // Replace reference so the rest of the code uses the new container
        container = fixedContainer;
      }

      const containerInfo = await container.inspect();

      let mappedPort = null;
      if (containerInfo.NetworkSettings.Ports) {
        const keys = Object.keys(containerInfo.NetworkSettings.Ports);
        if (keys.length > 0 && containerInfo.NetworkSettings.Ports[keys[0]]) {
           mappedPort = parseInt(containerInfo.NetworkSettings.Ports[keys[0]][0].HostPort, 10);
        }
      }

      emitLog('> Your app is now live!');
      logger.info(`Started container ${containerName} on port ${mappedPort} (internal: ${actualPort || containerPort})`);

      // Attach container logs stream to websocket
      const logStream = await container.logs({
        stdout: true,
        stderr: true,
        follow: true,
        tail: 50,
      });

      docker.modem.demuxStream(logStream,
        { write: (chunk: any) => { emitLog(chunk.toString()); return true; } } as any,
        { write: (chunk: any) => { 
          const msg = chunk.toString();
          // Many apps use stderr for notices. Only tag as ERROR if it contains error keywords
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

      return { containerId: container.id, port: mappedPort };
    } catch (error: any) {
      emitLog(`> Failed to launch app: ${error.message || 'Unknown error'}`);
      logger.error(`Runner failed for project ${projectId}`, error);
      await prisma.project.update({ where: { id: projectId }, data: { status: 'failed' } });
      await prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'failed' } });
      throw error;
    }
  }

  /**
   * Detect the actual port an app listens on by scanning source files,
   * then falling back to Docker image metadata.
   */
  private static async detectPort(projectId: string, imageName: string): Promise<string> {
    const sourceDir = path.join(process.cwd(), 'storage', 'projects', projectId, 'source');

    // 1. Check Dockerfile for explicit EXPOSE (last one wins in multi-stage)
    try {
      const dockerfile = await fs.readFile(path.join(sourceDir, 'Dockerfile'), 'utf8');
      const exposeMatches = dockerfile.match(/^EXPOSE\s+(\d+)/gm);
      if (exposeMatches && exposeMatches.length > 0) {
        const lastExpose = exposeMatches[exposeMatches.length - 1];
        const port = lastExpose.match(/\d+/)?.[0];
        if (port) {
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
          if (listenMatch && listenMatch[1] !== '80') {
            logger.info(`Port ${listenMatch[1]} from ${file} listen directive`);
            return listenMatch[1];
          }
        }
      }
    } catch {}

    // 3. Check ENV PORT in Dockerfile (e.g. ENV PORT=3000)
    try {
      const dockerfile = await fs.readFile(path.join(sourceDir, 'Dockerfile'), 'utf8');
      const envPortMatch = dockerfile.match(/ENV\s+PORT[=\s]+(\d+)/);
      if (envPortMatch) {
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
        logger.info(`Port ${port} from image ExposedPorts`);
        return port;
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
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      
      let cpuPercent = 0;
      if (systemDelta > 0 && cpuDelta > 0) {
        cpuPercent = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100.0;
      }

      // Memory usage
      const memUsage = stats.memory_stats.usage;
      const memLimit = stats.memory_stats.limit;
      const memPercent = (memUsage / memLimit) * 100.0;

      return {
        cpu: parseFloat(cpuPercent.toFixed(2)),
        memory: {
          usage: memUsage,
          limit: memLimit,
          percent: parseFloat(memPercent.toFixed(2))
        }
      };
    } catch (e) {
      return null;
    }
  }

  public static async stopContainer(projectId: string) {
    try {
      const containerName = `codehost-run-${projectId}`;
      const container = docker.getContainer(containerName);
      await container.stop();
      await container.remove();
      logger.info(`Stopped and removed container ${containerName}`);
    } catch (e: any) {
      logger.warn(`Could not stop container for ${projectId}: ${e.message}`);
    }
  }
}
