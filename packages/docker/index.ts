import Docker from 'dockerode';
import { logger } from '@codehost/logger';

export const docker = new Docker();

export async function checkDockerHealth() {
  try {
    await docker.ping();
    logger.info('Docker connected');
    return true;
  } catch (error) {
    logger.error({ error }, 'Docker health check failed');
    return false;
  }
}

export default docker;
