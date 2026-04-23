import Redis from 'ioredis';
import logger from '../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
  reconnectOnError: (err) => {
    logger.error(`Redis connection error: ${err.message}`);
    return true;
  },
});

redisConnection.on('connect', () => {
  logger.info('✅ Redis connected successfully');
});

redisConnection.on('error', (err) => {
  logger.error(`❌ Redis connection error: ${err.message}`);
});

export default redisConnection;
