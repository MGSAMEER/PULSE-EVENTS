import { Queue } from 'bullmq';
import redisConnection from '../config/redisConfig';
import logger from '../utils/logger';

export const EMAIL_QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5 seconds initial delay
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

/**
 * Adds an email job to the queue
 */
export async function addEmailToQueue(booking: any) {
  try {
    const jobId = `email-${booking._id}`;
    await emailQueue.add(
      'send-booking-confirmation',
      { bookingId: booking._id },
      { jobId }
    );
    logger.info(`📨 Email job added to queue for booking: ${booking._id}`);
  } catch (error: any) {
    logger.error(`❌ Failed to add email job to queue: ${error.message}`);
    throw error;
  }
}
