import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { getAllowedOrigins } from './config/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger, bodyLogger } from './middleware/requestLogger';
import { createLogger } from '../utils/logger';
import jiraRoutes from './routes/jira';
import fileRoutes from './routes/files';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 9999;
const serverLogger = createLogger('SERVER');

// Get origins and validate
const allowedOrigins = getAllowedOrigins();
serverLogger.info('CORS allowed origins:', allowedOrigins);

// Middleware setup
app.use(cors({
    origin: allowedOrigins,
    credentials: true // Allow cookies
}));
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET)); // Enable encrypted cookies

// Logging middleware
app.use(requestLogger);
app.use(bodyLogger);

// Routes
app.use('/api/jira', jiraRoutes);
app.use('/api', fileRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log('\n');
    serverLogger.success(`Server running on port ${PORT}`);
    serverLogger.info(`Environment: ${process.env.DEV === 'true' ? 'Development' : 'Production'}`);
    if (process.env.DEV === 'true') {
        serverLogger.info('Filesystem endpoints: Enabled');
        serverLogger.info('Request logging: Enabled');
    }
    console.log('\n');
});