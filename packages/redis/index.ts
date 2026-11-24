import { Redis } from 'ioredis';
import { env } from '@codehost/config';
import { logger } from '@codehost/logger';

const isTestEnv = process.env.NODE_ENV === 'test';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: isTestEnv,
  ...(isTestEnv ? { retryStrategy: () => null } : {}),
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (error) => logger.error({ error }, 'Redis error'));

export default redis;
