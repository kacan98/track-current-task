import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables from parent directory
dotenv.config({ path: '../.env' });

// Import routes
import jiraRoutes from './routes/jira';
import fileRoutes from './routes/files';
import githubRoutes from './routes/github';
import { getAllowedOrigins } from './config/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

// Get origins and validate
const getAllowedOriginsForEnvironment = () => {
  if (process.env.NODE_ENV === 'production') {
    // Use Vercel's built-in VERCEL_URL environment variable
    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
    if (vercelUrl) {
      return [vercelUrl];
    }
    // Fallback to custom FRONTEND_URL if provided
    if (process.env.FRONTEND_URL) {
      return [process.env.FRONTEND_URL];
    }
    throw new Error('Neither VERCEL_URL nor FRONTEND_URL environment variable found in production');
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

// Cookie parsing for serverless
if (process.env.COOKIE_SECRET) {
  app.use(cookieParser(process.env.COOKIE_SECRET));
}

// Routes  
app.use('/api/jira', jiraRoutes);
app.use('/api/github', githubRoutes);
app.use('/api', fileRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Express on Vercel");
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;