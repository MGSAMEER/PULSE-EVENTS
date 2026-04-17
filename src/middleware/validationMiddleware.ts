import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/errors';
import logger from '../utils/logger';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
      }));
      
      logger.debug(`Validation failed for ${req.method} ${req.path}: ${JSON.stringify(errors)}`);

      // Use the first error message as the main message for better visibility
      const mainMessage = `Validation failed: ${errors[0].message}`;

      // Pass to global error handler
      return next(new ValidationError(mainMessage, errors));
    }

    // Replace req.body with validated value (handles stripUnknown)
    req.body = value;
    next();
  };
};