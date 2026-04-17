import { Request, Response } from 'express';
import Event from '../models/Event';
import User from '../models/User';
import { ApiResponseUtil } from '../utils/response';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export const getEvents = async (req: Request, res: Response) => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(20, parseInt(req.query.limit as string) || 9);
    const skip    = (page - 1) * limit;
    const search  = (req.query.search  as string || '').trim();
    const category = (req.query.category as string || '').trim();
    const location = (req.query.location as string || '').trim();

    // Build filter
    const filter: any = { status: 'active' };
    if (category && category !== 'All') filter.category = category;
    if (location  && location  !== 'All') filter.venue = { $regex: location, $options: 'i' };
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { venue: { $regex: search, $options: 'i' } },
        { tags:  { $regex: search, $options: 'i' } },
      ];
    }

    const [events, total] = await Promise.all([
      Event.find(filter)
        .sort({ date: 1 })
        .skip(skip)
        .limit(limit)
        .select('name description date venue price earlyBirdPrice availableTickets category tags flyerImage'),
      Event.countDocuments(filter),
    ]);

    return ApiResponseUtil.success(res, 'Events fetched', {
      events,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: page * limit < total },
    });
  } catch (error: any) {
    logger.error('Get Events Error:', error);
    throw new AppError('Failed to fetch events', 500);
  }
};

export const getRecommendedEvents = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Unauthorized: Access denied', 401);
    }

    const user = await User.findById(userId);
    
    if (!user || !user.interests || user.interests.length === 0) {
      const events = await Event.find({ status: 'active' }).limit(5);
      return ApiResponseUtil.success(res, 'Fallback recommendations fetched', events);
    }

    const recommendedEvents = await Event.find({
      status: 'active',
      $or: [
        { tags: { $in: user.interests } },
        { category: { $in: user.interests } }
      ]
    }).limit(10);

    return ApiResponseUtil.success(res, 'Interest-based recommendations fetched', recommendedEvents);
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Recommendation Error:', error);
    throw new AppError('Failed to fetch recommendations', 500);
  }
};

export const getEventById = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      throw new AppError('Event not found', 404);
    }
    return ApiResponseUtil.success(res, 'Event details fetched', event);
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Get Event Error:', error);
    throw new AppError('Failed to fetch event details', 500);
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { name, description, date, venue, price, category, tags, earlyBirdPrice, earlyBirdDeadline, capacity } = req.body;
    
    // Check for uploaded flyer
    const flyerImage = req.file ? (req.file as any).path : undefined;

    const event = new Event({
      name,
      description,
      date,
      venue,
      price,
      category,
      tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? JSON.parse(tags) : []),
      earlyBirdPrice,
      earlyBirdDeadline,
      capacity,
      availableTickets: capacity,
      flyerImage,
      organizer: req.user?.id
    });

    await event.save();
    logger.info(`Event created: ${name}`);
    return ApiResponseUtil.success(res, 'Event created successfully', event, 201);
  } catch (error: any) {
    logger.error('Create Event Error:', error);
    throw new AppError('Failed to create event: ' + error.message, 500);
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const updateData = { ...req.body };
    
    // Check for new flyer upload
    if (req.file) {
       updateData.flyerImage = (req.file as any).path;
    }

    if (updateData.tags && typeof updateData.tags === 'string') {
       try { updateData.tags = JSON.parse(updateData.tags); } catch(e) {}
    }

    const event = await Event.findById(req.params.id);
    if (!event) throw new AppError('Event not found', 404);

    // Security Check: Only admin or the creator (organizer) can modify
    if (req.user?.role !== 'ADMIN' && event.organizer.toString() !== req.user?.id?.toString()) {
        throw new AppError('Unauthorized: You do not have permission to edit this event', 403);
    }

    const updatedEvent = await Event.findByIdAndUpdate(req.params.id, updateData, { new: true });
    logger.info(`Event updated: ${req.params.id}`);
    return ApiResponseUtil.success(res, 'Event updated successfully', updatedEvent);
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Update Event Error:', error);
    throw new AppError('Failed to update event', 500);
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw new AppError('Event not found', 404);

    // Security Check: Only admin or the creator (organizer) can terminate
    if (req.user?.role !== 'ADMIN' && event.organizer.toString() !== req.user?.id?.toString()) {
        throw new AppError('Unauthorized: You do not have permission to delete this event', 403);
    }

    await event.deleteOne();
    logger.info(`Event deleted: ${req.params.id}`);
    return ApiResponseUtil.success(res, 'Event deleted successfully');
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Delete Event Error:', error);
    throw new AppError('Failed to delete event', 500);
  }
};
