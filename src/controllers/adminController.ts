import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Event from '../models/Event';
import Booking from '../models/Booking';
import Payment from '../models/Payment';
import { sendBulkAnnouncement } from '../utils/emailService';
import { ApiResponseUtil } from '../utils/response';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const { range = '30d' } = req.query;
    let startDate = new Date();

    if (range === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (range === '30d') startDate.setDate(startDate.getDate() - 30);
    else if (range === 'all') startDate = new Date(0);

    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments({ 
      status: 'confirmed',
      createdAt: { $gte: startDate }
    });
    
    const revenueData = await Payment.aggregate([
      { $match: { status: 'succeeded', createdAt: { $gte: startDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    const eventBookings = await Booking.aggregate([
      { $match: { status: 'confirmed', createdAt: { $gte: startDate } } },
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $group: {
          _id: '$eventId',
          eventName: { $first: '$event.name' },
          bookingsCount: { $sum: '$ticketsCount' },
          revenue: { $sum: '$totalPrice' }
        }
      },
      { $sort: { bookingsCount: -1 } }
    ]);

    const recentBookings = await Booking.find()
      .populate('eventId', 'name date location')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    const statusCounts = await Booking.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const formattedStatus = {
      confirmed: statusCounts.find(s => s._id === 'confirmed')?.count || 0,
      pending: statusCounts.find(s => s._id === 'pending')?.count || 0,
      failed: statusCounts.find(s => s._id === 'failed')?.count || 0
    };

    return ApiResponseUtil.success(res, 'Analytics retrieved successfully', {
      totalUsers,
      totalBookings,
      totalRevenue,
      eventBookings,
      recentBookings,
      statusCounts: formattedStatus
    });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Analytics Fetch Error:', error);
    throw new AppError('Failed to fetch analytics', 500);
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password');
    return ApiResponseUtil.success(res, 'Users fetched successfully', users);
  } catch (error: any) {
    logger.error('Get Users Error:', error);
    throw new AppError('Failed to fetch users', 500);
  }
};

export const getRevenue = async (req: Request, res: Response) => {
  try {
    const revenue = await Payment.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    return ApiResponseUtil.success(res, 'Revenue fetched successfully', { totalRevenue: revenue[0]?.total || 0 });
  } catch (error: any) {
    logger.error('Get Revenue Error:', error);
    throw new AppError('Failed to fetch revenue', 500);
  }
};

export const broadcastAnnouncement = async (req: Request, res: Response) => {
  try {
    const { subject, message, eventId } = req.body;
    
    let targetUsers: any[] = [];
    if (eventId) {
      const bookings = await Booking.find({ eventId, status: 'confirmed' }).populate('userId');
      targetUsers = bookings.map(b => b.userId as any);
    } else {
      targetUsers = await User.find();
    }

    const emails = targetUsers.map(u => u.email);
    await sendBulkAnnouncement(emails, subject, message);

    return ApiResponseUtil.success(res, `Announcement sent to ${targetUsers.length} users`);
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Broadcast Error:', error);
    throw new AppError('Failed to send broadcast', 500);
  }
};

export const createStaff = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    
    let user = await User.findOne({ email });
    if (user) {
      throw new AppError('Credential collision: Node already exists', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'staff',
    });

    await user.save();
    return ApiResponseUtil.success(res, 'Staff node initialized successfully', { 
      user: { 
        _id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    }, 201);
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Create Staff Error:', error);
    throw new AppError('Failed to initialize staff node', 500);
  }
};

export const getStaffs = async (req: Request, res: Response) => {
  try {
    const staffs = await User.find({ role: 'STAFF' }).select('-password');
    return ApiResponseUtil.success(res, 'Staff nodes fetched', staffs);
  } catch (error: any) {
    logger.error('Get Staffs Error:', error);
    throw new AppError('Failed to fetch staff nodes', 500);
  }
};

export const deleteStaff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user || user.role !== 'STAFF') {
      throw new AppError('Node not found or not a staff member', 404);
    }

    await User.findByIdAndDelete(id);
    return ApiResponseUtil.success(res, 'Staff node terminated successfully');
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Delete Staff Error:', error);
    throw new AppError('Failed to terminate staff node', 500);
  }
};
