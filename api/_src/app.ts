import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

console.log('🚀 Creating Express app...');

// Load environment variables
dotenv.config();
console.log('✅ Environment variables loaded');

// Import routes
console.log('📦 Loading route modules...');
import jiraRoutes from './routes/jira';
console.log('✅ Jira routes loaded');
import fileRoutes from './routes/files';
console.log('✅ File routes loaded');
import githubRoutes from './routes/github';
console.log('✅ GitHub routes loaded');
import { getAllowedOrigins } from './config/cors';
console.log('✅ CORS config loaded');
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
console.log('✅ Error handlers loaded');

const app = express();
console.log('🌐 Express app created');

// Get origins and validate
console.log('🔧 Configuring CORS...');
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
console.log('✅ Allowed origins:', allowedOrigins);

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
console.log('🛣️ Setting up routes...');
app.use('/api/jira', jiraRoutes);
console.log('✅ Jira routes mounted on /api/jira');
app.use('/api/github', githubRoutes);
console.log('✅ GitHub routes mounted on /api/github');
app.use('/api', fileRoutes);
console.log('✅ File routes mounted on /api');

// Root route
app.get("/", (req, res) => {
  console.log('📞 Root route called');
  res.send("Express on Vercel");
});
console.log('✅ Root route configured');

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

console.log('✅ Express app fully configured');

export default app;