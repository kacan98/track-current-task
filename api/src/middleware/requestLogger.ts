import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@shared/logger';

const httpLogger = createLogger('HTTP');

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Capture the original end function
  const originalEnd = res.end;
  
  // Override end function to log response
  res.end = function(this: Response, ...args: Parameters<Response['end']>) {
    const duration = Date.now() - start;
    
    // Log the request with response details
    httpLogger.request(req.method, req.path, res.statusCode, duration);
    
    // Call original end function
    return originalEnd.apply(this, args);
  } as Response['end'];
  
  next();
};

// Middleware to log request body in development (excluding sensitive data)
export const bodyLogger = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.DEV === 'true' && req.body && Object.keys(req.body).length > 0) {
    // Create a sanitized copy of the body
    const sanitized = { ...req.body };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    httpLogger.debug('Request body:', sanitized);
  }
  next();
};