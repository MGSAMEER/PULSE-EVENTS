import { Worker, Job } from 'bullmq';
import redisConnection from '../config/redisConfig';
import Booking from '../models/Booking';
import { sendBookingConfirmation } from '../utils/emailService';
import { generateTicketPDF } from '../utils/pdfGenerator';
import QRCode from 'qrcode';
import logger from '../utils/logger';
import { EMAIL_QUEUE_NAME } from '../queues/emailQueue';

/**
 * Worker to process email jobs from BullMQ
 */
export const emailWorker = new Worker(
  EMAIL_QUEUE_NAME,
  async (job: Job) => {
    const { bookingId } = job.data;
    logger.info(`🔄 Processing email job for booking: ${bookingId}`);

    try {
      // 1. Fetch booking with details
      const booking = await Booking.findById(bookingId).populate('eventId userId');
      if (!booking) {
        logger.error(`❌ Booking ${bookingId} not found for email job`);
        return;
      }

      const userEmail = (booking.userId as any).email;
      const eventName = (booking.eventId as any).name;

      if (!userEmail) {
        logger.error(`❌ User email missing for booking ${bookingId}`);
        await Booking.findByIdAndUpdate(bookingId, { emailStatus: 'FAILED' });
        return;
      }

      // 2. Generate Assets
      const qrBuffer = await QRCode.toBuffer(booking.qrCode || '', {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 150
      });
      
      const pdfBuffer = await generateTicketPDF(booking, booking.eventId, qrBuffer);

      // 3. Send Email
      const emailSent = await sendBookingConfirmation(
        userEmail,
        eventName,
        booking._id.toString(),
        qrBuffer,
        pdfBuffer
      );

      if (emailSent) {
        await Booking.findByIdAndUpdate(bookingId, { emailStatus: 'SENT' });
        logger.info(`✅ Email successfully processed for booking ${bookingId}`);
      } else {
        throw new Error('Email service returned failure');
      }
    } catch (error: any) {
      logger.error(`❌ Error in email worker for booking ${bookingId}: ${error.message}`);
      await Booking.findByIdAndUpdate(bookingId, { emailStatus: 'FAILED' });
      throw error; // Rethrow for BullMQ retry
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

emailWorker.on('completed', (job) => {
  logger.info(`🏁 Job ${job.id} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
  logger.error(`💥 Job ${job?.id} failed: ${err.message}`);
});

export default emailWorker;
