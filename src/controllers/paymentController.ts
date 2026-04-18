import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import QRCode from 'qrcode';
import Booking from '../models/Booking';
import Payment from '../models/Payment';
import { generateQRData } from '../utils/qrGenerator';
import { sendBookingConfirmation } from '../utils/emailService';
import { generateTicketPDF } from '../utils/pdfGenerator';
import { ApiResponseUtil } from '../utils/response';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

const getRazorpayInstance = () => {
  const key_id = (process.env.RAZORPAY_KEY_ID || '').trim();
  const key_secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  
  if (!key_id || !key_secret || key_id === 'RAZORPAY_NOT_SET') {
    logger.error('CRITICAL: Razorpay credentials missing or invalid in environment!');
  }
  
  return new Razorpay({ key_id, key_secret });
};

const razorpay = getRazorpayInstance();

// Debug: Verify key prefixes (Safe log)
const kid = (process.env.RAZORPAY_KEY_ID || '').trim();
const ksec = (process.env.RAZORPAY_KEY_SECRET || '').trim();
logger.info(`Razorpay Engine Initialized | Key ID Prefix: ${kid.slice(0, 8)}... | Secret Prefix: ${ksec.slice(0, 4)}...`);

/**
 * 🔧 Helper function to send booking confirmation email
 * Properly handles async operations with retry logic for SMTP issues
 */
const sendBookingEmailAsync = async (booking: any): Promise<void> => {
  try {
    if (!booking.eventId || !booking.userId) {
      logger.warn(`⚠️ Email not sent for booking ${booking._id}: Missing event or user data`);
      return;
    }

    const userEmail = (booking.userId as any).email;
    const eventName = (booking.eventId as any).name;

    if (!userEmail) {
      logger.error(`❌ Cannot send email - user email missing for booking ${booking._id}`);
      return;
    }

    logger.info(`📧 Starting email generation for booking ${booking._id} to ${userEmail}`);

    // Generate QR Code Buffer
    logger.debug(`Generating QR code for booking ${booking._id}...`);
    const qrBuffer = await QRCode.toBuffer(booking.qrCode, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 150
    });
    
    // Generate PDF Ticket
    logger.debug(`Generating PDF ticket for booking ${booking._id}...`);
    const pdfBuffer = await generateTicketPDF(booking, booking.eventId, qrBuffer);

    // Send Email with retry and check return value
    logger.debug(`Sending email via SMTP for booking ${booking._id}...`);
    const emailSent = await sendBookingConfirmation(
      userEmail,
      eventName,
      booking._id.toString(),
      qrBuffer,
      pdfBuffer
    );

    if (emailSent) {
      logger.info(`✅ Confirmation email successfully sent to ${userEmail} for booking ${booking._id}`);
    } else {
      logger.error(`❌ Confirmation email FAILED - Not delivered to ${userEmail} for booking ${booking._id}. Check SMTP configuration.`);
    }
  } catch (error: any) {
    logger.error(`❌ Email sending failed for booking ${booking._id}: ${error.message}`, {
      errorType: error.name,
      stack: error.stack
    });
    // Don't rethrow - email failure shouldn't affect payment confirmation
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.body;
    logger.debug(`Payment request initialization for booking: ${bookingId}`);
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required to generate order', 401);
    }

    // Find the booking
    const booking = await Booking.findById(bookingId).populate('eventId');
    if (!booking) {
      throw new AppError('Target booking does not exist in registry', 404);
    }

    if (booking.userId.toString() !== userId?.toString()) {
      throw new AppError('Unauthorized access to booking data', 403);
    }

    if (booking.status !== 'pending') {
      throw new AppError('This booking has already been processed', 400);
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(booking.totalPrice * 100), // Convert to paise and ensure integer
      currency: 'INR',
      receipt: `receipt_${bookingId}`,
    };

    const order = await razorpay.orders.create(options);
    logger.info(`Razorpay order ${order.id} created for booking ${bookingId}`);

    // Save or Update payment record
    const payment = await Payment.findOneAndUpdate(
      { bookingId },
      {
        amount: booking.totalPrice,
        razorpayOrderId: order.id,
        status: 'pending',
      },
      { upsert: true, new: true }
    );

    return ApiResponseUtil.success(res, 'Payment gateway initialized', {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Order creation failure detailed:', { 
      message: error.message, 
      stack: error.stack,
      raw: JSON.stringify(error)
    });
    throw new AppError('Payment engine synchronization failed', 500);
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError('Incomplete payment verification tokens', 400);
    }

    // 1. SIGNATURE VERIFICATION
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    const expectedSign = crypto
      .createHmac('sha256', secret)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      logger.warn(`SECURITY: Invalid payment signature for order ${razorpay_order_id} from ${req.ip}`);
      throw new AppError('Digital signature mismatch. Security alert triggered.', 400);
    }

    // 2. IDEMPOTENCY CHECK (Prevent duplicate confirmation)
    const existingPayment = await Payment.findOne({ 
      razorpayPaymentId: razorpay_payment_id, 
      status: 'succeeded' 
    });
    if (existingPayment) {
      logger.debug(`Duplicate payment attempt detected: ${razorpay_payment_id}`);
      return ApiResponseUtil.success(res, 'Payment already verified in earlier cycle', null);
    }

    // 3. FIND PAYMENT RECORD
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      throw new AppError('Payment trace lost in the grid', 404);
    }

    // 4. UPDATE PAYMENT
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.status = 'succeeded';
    await payment.save();

    // 5. BOOKING ACTIVATION
    const booking = await Booking.findById(payment.bookingId).populate('eventId userId');
    if (!booking) {
      throw new AppError('Associated booking not found', 404);
    }

    // IDOR Protection: Ensure user owns the booking or is admin
    const userId = req.user?.id;
    if (booking.userId._id.toString() !== userId?.toString() && req.user?.role !== 'ADMIN') {
      logger.warn(`IDOR ALERT: User ${userId} attempted to verify booking ${booking._id}`);
      throw new AppError('Access denied: Unauthorized permit validation', 403);
    }

    if (booking.status === 'confirmed') {
      return ApiResponseUtil.success(res, 'Booking already synchronized', null);
    }

    // Generate Base64 QR Code string
    booking.status = 'confirmed';
    booking.qrCode = generateQRData(booking._id.toString());
    await booking.save();

    logger.info(`Booking ${booking._id} confirmed via payment ${razorpay_payment_id}`);

    // 6. 📧 SEND EMAIL NOTIFICATION IN BACKGROUND (Non-blocking)
    // Use setImmediate to queue email sending after response is sent
    setImmediate(() => {
      sendBookingEmailAsync(booking).catch(err => {
        logger.error(`Uncaught error in background email task: ${err.message}`);
      });
    });

    return ApiResponseUtil.success(res, 'Payment verified and booking confirmed successfully', {
      bookingId: booking._id,
      status: booking.status,
      qrCode: booking.qrCode
    });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Payment verification failure: ${error.message}`);
    throw new AppError('Payment confirmation engine offline', 500);
  }
};
