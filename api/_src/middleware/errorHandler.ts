import { Request, Response, NextFunction } from 'express';
import { AxiosError } from 'axios';
import { createLogger } from '../../../shared/logger';

const errorLogger = createLogger('ERROR');

// Custom error class for API errors
export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;
  isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    code: string,
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error wrapper for route handlers
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global error handler middleware
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Default to 500 server error
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details = undefined;

  // Handle our custom ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } 
  // Handle Axios errors (from Jira API calls)
  else if ((err as AxiosError).isAxiosError) {
    const axiosError = err as AxiosError;
    statusCode = axiosError.response?.status || 500;
    code = `JIRA_${statusCode}`;
    const responseData = axiosError.response?.data as { errorMessages?: string[]; message?: string };
    message = responseData?.errorMessages?.join(', ') || 
              responseData?.message || 
              axiosError.message;
    details = {
      jiraResponse: axiosError.response?.data,
      url: axiosError.config?.url
    };
  }
  // Handle validation errors
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = err.message;
  }
  // Handle other errors
  else if (err instanceof Error) {
    message = err.message;
  }

  // Log error details (but not sensitive data)
  errorLogger.error(`${code}: ${message}`);
  errorLogger.debug(`${req.method} ${req.path} - Status: ${statusCode}`);
  
  // Only log stack trace in development
  if (process.env.DEV === 'true' && err.stack) {
    errorLogger.debug('Stack trace:', err.stack);
  }

  // Send error response
  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(process.env.DEV === 'true' && details ? { details } : {}),
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError(
    404,
    `Cannot ${req.method} ${req.path}`,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};