import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  lazyConnect: false,
});

redis.on('connect', () => console.log('[Redis] Connected'));
redis.on('error', (err) => console.error('[Redis] Error:', err.message));

export default redis;

