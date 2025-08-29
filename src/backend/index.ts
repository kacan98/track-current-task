import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { getAllowedOrigins } from './config/cors';
import jiraRoutes from './routes/jira';
import fileRoutes from './routes/files';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 9999;

// Get origins and validate
const allowedOrigins = getAllowedOrigins();
console.log(`[CORS] Allowed origins:`, allowedOrigins);

// Middleware setup
app.use(cors({
    origin: allowedOrigins,
    credentials: true // Allow cookies
}));
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET)); // Enable encrypted cookies

// Routes
app.use('/api/jira', jiraRoutes);
app.use('/api', fileRoutes);

// Catch-all 404 handler for unknown routes
app.use((req, res) => {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
});

app.listen(PORT, () => {
    console.log(`Jira proxy server running on port ${PORT}`);
    console.log(`Development mode: ${process.env.DEV === 'true' ? 'ENABLED' : 'DISABLED'}`);
    if (process.env.DEV === 'true') {
        console.log('→ Filesystem endpoints available at /api/activity-log');
    }
});