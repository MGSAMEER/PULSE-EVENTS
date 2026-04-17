import { Request, Response } from 'express';
import Booking from '../models/Booking';
import Event from '../models/Event';
import { ApiResponseUtil } from '../utils/response';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export const createBooking = async (req: Request, res: Response) => {
  try {
    const { eventId, ticketsCount } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User authentication required', 401);
    }

    const event = await Event.findById(eventId);
    
    if (!event) {
      throw new AppError('Event link invalid or non-existent', 404);
    }

    const eventDate = new Date(event.date);
    if (eventDate < new Date()) {
      throw new AppError('Cannot book missions that have already completed', 400);
    }

    if (event.status !== 'active') {
      throw new AppError('Event is currently offline for maintenance', 400);
    }

    // Enforcement of ticket limit per user (MAX 5)
    const previousBookings = await Booking.find({ 
      userId, 
      eventId, 
      status: { $in: ['pending', 'confirmed'] } 
    });

    const totalTicketsPurchased = previousBookings.reduce((sum, b) => sum + b.ticketsCount, 0);
    const MAX_TICKETS_PER_USER = 5;

    if (totalTicketsPurchased + ticketsCount > MAX_TICKETS_PER_USER) {
      throw new AppError(`Resource limit exceeded. You can only purchase a total of ${MAX_TICKETS_PER_USER} tickets per mission. You have already secured ${totalTicketsPurchased} units.`, 400);
    }

    const updatedEvent = await Event.findOneAndUpdate(
      { _id: eventId, availableTickets: { $gte: ticketsCount }, status: 'active' },
      { $inc: { availableTickets: -ticketsCount } },
      { new: true }
    );

    if (!updatedEvent) {
      throw new AppError('Insufficient capacity in the grid segment', 400);
    }

    let ticketPrice = event.price;
    const now = new Date();
    if (event.earlyBirdPrice && event.earlyBirdDeadline && now <= new Date(event.earlyBirdDeadline)) {
      ticketPrice = event.earlyBirdPrice;
      logger.debug(`Early bird pricing applied: ${ticketPrice} for event ${eventId}`);
    }
    const totalPrice = ticketPrice * ticketsCount;

    const booking = new Booking({
      userId,
      eventId,
      ticketsCount,
      totalPrice,
      status: 'pending',
    });

    await booking.save();
    logger.info(`Booking ${booking._id} created for user ${userId} on event ${eventId}`);

    return ApiResponseUtil.success(res, 'Booking reservation secured', booking, 201);
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Booking failure: ${error.message}`);
    throw new AppError(error.message || 'Booking engine failure', 500);
  }
};

export const getBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const bookings = await Booking.find({ userId }).populate('eventId').sort({ createdAt: -1 });
    return ApiResponseUtil.success(res, 'Permit history retrieved', bookings);
  } catch (error: any) {
    logger.error(`Fetch Bookings Error: ${error.message}`);
    throw new AppError('Failed to fetch permit history', 500);
  }
};

export const getBookingById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const booking = await Booking.findById(req.params.id).populate('eventId');
    
    if (!booking) {
      throw new AppError('Permit record not found', 404);
    }

    if (booking.userId.toString() !== userId?.toString() && req.user?.role !== 'ADMIN') {
      throw new AppError('Access denied: Unauthorized access attempt', 403);
    }

    return ApiResponseUtil.success(res, 'Permit details retrieved', booking);
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Fetch Booking By ID Error: ${error.message}`);
    throw new AppError('Failed to fetch permit details', 500);
  }
};

export const getBookingQR = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      throw new AppError('Permit record not found', 404);
    }

    if (booking.userId.toString() !== userId) {
      throw new AppError('Access denied: Identity mismatch', 403);
    }

    if (booking.status !== 'confirmed' || !booking.qrCode) {
      throw new AppError('QR code not active: Payment required', 400);
    }

    return ApiResponseUtil.success(res, 'QR data retrieved', { qrCode: booking.qrCode });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Fetch QR Error: ${error.message}`);
    throw new AppError('Failed to retrieve QR signature', 500);
  }
};

export const markBookingFailed = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user?.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new AppError('Target booking does not exist in registry', 404);
    }

    if (booking.userId.toString() !== userId && req.user?.role !== 'ADMIN') {
      throw new AppError('Unauthorized to modify this permit', 403);
    }

    // Only process if it was pending
    if (booking.status === 'pending') {
      booking.status = 'failed';
      await booking.save();

      // Return tickets to inventory
      await Event.findByIdAndUpdate(booking.eventId, {
        $inc: { availableTickets: booking.ticketsCount }
      });

      logger.info(`Booking ${bookingId} marked as failed. Units returned to event ${booking.eventId}`);
    }

    return ApiResponseUtil.success(res, 'Booking status updated successfully', { status: 'failed' });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Mark Failed Error: ${error.message}`);
    throw new AppError('Failed to synchronize status failure', 500);
  }
};

export const cleanOldPendingBookings = async (req: Request, res: Response) => {
  try {
    // Mark PENDING bookings older than 15 minutes as FAILED
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const staleBookings = await Booking.find({
      status: 'pending',
      createdAt: { $lt: fifteenMinutesAgo }
    });

    if (staleBookings.length > 0) {
      for (const booking of staleBookings) {
        booking.status = 'failed';
        await booking.save();

        // Increment inventory
        await Event.findByIdAndUpdate(booking.eventId, {
          $inc: { availableTickets: booking.ticketsCount }
        });
      }
      
      logger.info(`Cleanup: Converted ${staleBookings.length} stale pending bookings to failed.`);
    }

    return ApiResponseUtil.success(res, `Cleanup operation complete. Segments processed: ${staleBookings.length}`);
  } catch (error: any) {
    logger.error(`Cleanup Error: ${error.message}`);
    throw new AppError('Cleanup engine failure', 500);
  }
};
