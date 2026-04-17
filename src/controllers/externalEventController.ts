import { Request, Response } from 'express';
import ExternalEvent from '../models/ExternalEvent';
import { ApiResponseUtil } from '../utils/response';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export const getExternalEvents = async (req: Request, res: Response) => {
  try {
    const { approved, city } = req.query;
    
    const query: any = {};
    if (approved === 'true') {
      query.status = 'approved';
    } else if (req.user && req.user.role === 'ADMIN') {
      // Admins can see all if they don't specify approved=true
      if (approved === 'false') query.status = { $ne: 'approved' };
    } else {
      query.status = 'approved'; // Default for non-admins and guests
    }

    if (city) {
      query.city = new RegExp(city as string, 'i');
    }

    const events = await ExternalEvent.find(query).sort({ date: 1 });
    return ApiResponseUtil.success(res, 'External events fetched', events);
  } catch (error: any) {
    logger.error('Get External Events Error:', error);
    throw new AppError('Failed to fetch external events', 500);
  }
};

export const updateExternalEventStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' | 'rejected'

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      throw new AppError('Invalid status signal', 400);
    }

    const event = await ExternalEvent.findByIdAndUpdate(
      id, 
      { 
        status, 
        isApproved: status === 'approved' 
      }, 
      { new: true }
    );

    if (!event) throw new AppError('External node not found', 404);

    return ApiResponseUtil.success(res, `External event ${status}`, event);
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Update External Event Error:', error);
    throw new AppError('Failed to update external event status', 500);
  }
};

export const deleteExternalEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await ExternalEvent.findByIdAndDelete(id);
    if (!event) throw new AppError('External node not found', 404);
    return ApiResponseUtil.success(res, 'External event purged from registry');
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Delete External Event Error:', error);
    throw new AppError('Failed to delete external event', 500);
  }
};
