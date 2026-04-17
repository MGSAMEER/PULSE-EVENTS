import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError } from '../utils/errors';
import { ApiResponseUtil } from '../utils/response';
import logger from '../utils/logger';

// Handle Mongoose validation errors
const handleMongooseValidationError = (err: mongoose.Error.ValidationError): ValidationError => {
  const errors = Object.values(err.errors).map(error => ({
    field: error.path,
    message: error.message,
  }));
  return new ValidationError('Validation failed', errors);
};

// Handle Mongoose duplicate key errors
const handleMongooseDuplicateKeyError = (err: any): ConflictError => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new ConflictError(`${field} '${value}' already exists`);
};

// Handle Mongoose cast errors
const handleMongooseCastError = (err: mongoose.Error.CastError): AppError => {
  return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
};

// Handle JWT errors
const handleJWTError = (): AuthenticationError => {
  return new AuthenticationError('Invalid token');
};

const handleJWTExpiredError = (): AuthenticationError => {
  return new AuthenticationError('Token expired');
};

// Global error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  let error = err as any;

  // Log error using Winston
  logger.error(`${err.name}: ${err.message}\nStack: ${err.stack}`);

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    error = handleMongooseValidationError(err);
  }

  // Mongoose duplicate key error
  else if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    error = handleMongooseDuplicateKeyError(err);
  }

  // Mongoose cast error
  else if (err instanceof mongoose.Error.CastError) {
    error = handleMongooseCastError(err);
  }

  // JWT errors
  else if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }

  else if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Standardize error structure if not already an AppError
  if (!(error instanceof AppError)) {
    error = new AppError(err.message || 'Internal Server Error', 500, false);
  }

  // Send standardized error response
  return ApiResponseUtil.error(
    res,
    error.message,
    error.statusCode,
    error.data
  );
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): Response => {
  return ApiResponseUtil.error(res, `Route ${req.originalUrl} not found`, 404);
};