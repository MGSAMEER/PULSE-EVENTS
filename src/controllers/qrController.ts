import { Request, Response } from 'express';
import Booking from '../models/Booking';
import { verifyQRData } from '../utils/qrGenerator';
import { ApiResponseUtil } from '../utils/response';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export const validateQR = async (req: Request, res: Response) => {
  try {
    const { qrData } = req.body;
    const scannerId = (req as any).user?.id;

    if (!scannerId) {
      throw new AppError('Scanner identity not verified in the grid', 401);
    }

    const bookingId = verifyQRData(qrData);
    if (!bookingId) {
      throw new AppError('Corrupted or invalid digital permit signature', 400);
    }

    const booking = await Booking.findById(bookingId).populate('eventId userId');
    if (!booking) {
      throw new AppError('Permit record not found in central database', 404);
    }

    if (booking.status !== 'confirmed') {
      throw new AppError('Payment for this permit is still pending registration', 400);
    }

    // Mark as attended and log the scanner footprint
    let message = 'Access Granted: Welcome to the Pulse Mission';
    if (booking.attended) {
      message = 'ALREADY ADMITTED – Valid Entry Previously Logged';
      logger.warn(`Duplicate scan detected for booking ${bookingId} by staff ${scannerId}`);
    } else {
      booking.attended = true;
      logger.info(`Valid entry logged for booking ${bookingId} by staff ${scannerId}`);
    }

    // Push to audit log
    (booking as any).attendanceLog.push({
      scannedBy: scannerId as any,
      scannedAt: new Date(),
    });

    await booking.save();

    return ApiResponseUtil.success(res, message, {
      id: booking._id,
      eventName: (booking.eventId as any).name,
      userName: (booking.userId as any).name,
      ticketsCount: booking.ticketsCount,
      scanHistory: (booking as any).attendanceLog.length,
    });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`QR Validation Engine Failure: ${error.message}`);
    throw new AppError('QR Verification Terminal Offline', 500);
  }
};