import { Request, Response } from 'express';
import Sponsor from '../models/Sponsor';
import EventSponsor from '../models/EventSponsor';
import { ApiResponseUtil } from '../utils/response';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export const getSponsors = async (req: Request, res: Response) => {
  try {
    const sponsors = await Sponsor.find();
    return ApiResponseUtil.success(res, 'Sponsors fetched successfully', sponsors);
  } catch (error: any) {
    logger.error('Get Sponsors Error:', error);
    throw new AppError('Failed to fetch sponsors from the grid', 500);
  }
};

export const getSponsorById = async (req: Request, res: Response) => {
  try {
    const sponsor = await Sponsor.findById(req.params.id);
    if (!sponsor) {
      throw new AppError('Sponsor not found in the database', 404);
    }
    return ApiResponseUtil.success(res, 'Sponsor details retrieved', sponsor);
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Get Sponsor By ID Error:', error);
    throw new AppError('Failed to retrieve sponsor data', 500);
  }
};

export const createSponsor = async (req: Request, res: Response) => {
  try {
    logger.debug(`Sponsor creation request from ${req.ip}`);
    
    // Verify required fields
    const requiredFields = ['companyName', 'contactPerson', 'email', 'phone', 'sponsorshipLevel', 'agreementTerms', 'paymentAmount'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      logger.debug(`Missing sponsor fields: ${missingFields.join(', ')}`);
      throw new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400);
    }
    
    if (!req.body.bannerImage) {
      logger.debug('Sponsor creation rejected: Missing banner image');
      throw new AppError('Banner image URL is required. Please upload logo first.', 400);
    }
    
    const sponsor = new Sponsor(req.body);
    await sponsor.save();
    logger.info(`Sponsor created: ${sponsor.companyName} (${sponsor._id})`);
    return ApiResponseUtil.success(res, 'Sponsor account initialized', sponsor, 201);
  } catch (error: any) {
    logger.error(`Create Sponsor Error: ${error.message}`);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to initialize sponsor account: ' + error.message, 500);
  }
};

export const updateSponsor = async (req: Request, res: Response) => {
  try {
    const sponsor = await Sponsor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!sponsor) {
      throw new AppError('Sponsor entity not found', 404);
    }
    logger.info(`Sponsor updated: ${sponsor.companyName}`);
    return ApiResponseUtil.success(res, 'Sponsor entity updated', sponsor);
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Update Sponsor Error:', error);
    throw new AppError('Failed to update sponsor entity', 500);
  }
};

export const deleteSponsor = async (req: Request, res: Response) => {
  try {
    const sponsor = await Sponsor.findByIdAndDelete(req.params.id);
    if (!sponsor) {
      throw new AppError('Sponsor entity not found', 404);
    }
    logger.info(`Sponsor deleted: ${req.params.id}`);
    return ApiResponseUtil.success(res, 'Sponsor entity removed from the grid');
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Delete Sponsor Error:', error);
    throw new AppError('Failed to remove sponsor entity', 500);
  }
};

export const associateSponsorWithEvent = async (req: Request, res: Response) => {
  try {
    const { eventId, sponsorId, displayOrder } = req.body;

    const eventSponsor = new EventSponsor({
      eventId,
      sponsorId,
      displayOrder: displayOrder || 0,
    });

    await eventSponsor.save();
    logger.info(`Sponsor ${sponsorId} associated with event ${eventId}`);
    return ApiResponseUtil.success(res, 'Sponsor association established', eventSponsor, 201);
  } catch (error: any) {
    if (error.code === 11000) {
      throw new AppError('Link established: Sponsor already associated with this node', 400);
    }
    logger.error('Associate Sponsor Error:', error);
    throw new AppError('Failed to establish sponsor-event link', 500);
  }
};

export const getEventSponsors = async (req: Request, res: Response) => {
  try {
    const eventSponsors = await EventSponsor.find({ eventId: req.params.eventId })
      .populate('sponsorId')
      .sort({ displayOrder: 1 });

    return ApiResponseUtil.success(res, 'Event-specific sponsors retrieved', eventSponsors);
  } catch (error: any) {
    logger.error('Get Event Sponsors Error:', error);
    throw new AppError('Failed to fetch event sponsors', 500);
  }
};
