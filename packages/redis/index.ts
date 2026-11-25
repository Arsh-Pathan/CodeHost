import { Redis } from 'ioredis';
import { env } from '@codehost/config';
import { logger } from '@codehost/logger';

const isTestEnv = process.env.NODE_ENV === 'test';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: isTestEnv ? 0 : 20,
  connectTimeout: 5000,
  lazyConnect: isTestEnv,
  enableOfflineQueue: !isTestEnv,
  retryStrategy: isTestEnv
    ? () => null
    : (times: number) => Math.min(times * 200, 5000),
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (error) => logger.error({ error }, 'Redis error'));

export default redis;
