import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { getAllowedOrigins } from './config/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger, bodyLogger } from './middleware/requestLogger';
import { createLogger } from '@shared/logger';
import jiraRoutes from './routes/jira';
import fileRoutes from './routes/files';
import githubRoutes from './routes/github';

// Load environment variables
dotenv.config();

// Create Express app with environment-specific configuration
function createExpressApp(isServerless = false) {
  const app = express();

  // Get origins and validate
  const getAllowedOriginsForEnvironment = () => {
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.FRONTEND_URL) {
        throw new Error('FRONTEND_URL environment variable is required in production');
      }
      return [process.env.FRONTEND_URL];
    }
    return getAllowedOrigins();
  };

  const allowedOrigins = getAllowedOriginsForEnvironment();

  // Middleware setup
  app.use(cors({
    origin: allowedOrigins,
    credentials: true // Allow cookies
  }));
  app.use(express.json());

  // Cookie parsing - different for serverless vs dev server
  if (isServerless) {
    // Use full cookie-parser even in serverless for signed cookie support
    if (!process.env.COOKIE_SECRET) {
      throw new Error('COOKIE_SECRET environment variable is required for signed cookies');
    }
    app.use(cookieParser(process.env.COOKIE_SECRET));
  } else {
    // Full cookie-parser for development server
    if (!process.env.COOKIE_SECRET) {
      throw new Error('COOKIE_SECRET environment variable is required for signed cookies');
    }
    app.use(cookieParser(process.env.COOKIE_SECRET));
    // Logging middleware only in development
    app.use(requestLogger);
    app.use(bodyLogger);
  }

  // Routes
  app.use('/api/jira', jiraRoutes);
  app.use('/api/github', githubRoutes);
  app.use('/api', fileRoutes);

  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// Check if this is being run directly (development server) or as serverless function
const isDirectRun = require.main === module;

if (isDirectRun) {
  // Development server mode - traditional Express server
  const PORT = process.env.PORT || 9999;
  const serverLogger = createLogger('DEV-SERVER');
  
  const app = createExpressApp(false); // Dev mode: full cookies + logging
  
  console.log('Registering routes...');
  console.log('Jira routes registered');
  console.log('GitHub routes registered');
  console.log('File routes registered');
    
  app.listen(PORT, () => {
    console.log('\n');
    serverLogger.success(`Development server running on port ${PORT}`);
    serverLogger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    serverLogger.info('This is the development Express server');
    serverLogger.info('For serverless: use vercel dev or deploy to Vercel');
    if (process.env.NODE_ENV !== 'production') {
      serverLogger.info('Filesystem endpoints: Enabled');
      serverLogger.info('Request logging: Enabled');
    }
    console.log('\n');
  });
}

// Serverless function export - Express wrapper approach
// Official Vercel guide: https://vercel.com/guides/using-express-with-vercel
// 2025 benefits: 50% cost reduction, 95% fewer cold starts, shared middleware
const serverlessApp = createExpressApp(true); // Serverless mode: simplified cookies
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return serverlessApp(req as unknown as express.Request, res as unknown as express.Response);
};