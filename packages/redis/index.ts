import { Redis } from 'ioredis';
import { env } from '@codehost/config';
import { logger } from '@codehost/logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (error) => logger.error({ error }, 'Redis error'));

export default redis;
