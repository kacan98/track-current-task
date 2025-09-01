// Get allowed origins (platform-agnostic)
export const getAllowedOrigins = () => {
    // Development mode - allow localhost
    if (process.env.NODE_ENV === 'development' || process.env.DEV === 'true') {
        return [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:3000'
        ];
    }
    
    // Production mode - use explicit environment variable
    if (process.env.FRONTEND_URL) {
        return [process.env.FRONTEND_URL];
    }
    
    // Platform-specific fallbacks (but explicit env var is preferred)
    if (process.env.VERCEL_URL) {
        // Running on Vercel
        return [`https://${process.env.VERCEL_URL}`];
    }
    
    if (process.env.NETLIFY_URL) {
        // Running on Netlify
        return [process.env.NETLIFY_URL];
    }
    
    if (process.env.HEROKU_APP_NAME) {
        // Running on Heroku
        return [`https://${process.env.HEROKU_APP_NAME}.herokuapp.com`];
    }
    
    // No valid frontend origin found
    throw new Error('No frontend origin configured. Set FRONTEND_URL environment variable or NODE_ENV=development for local development.');
};

// Environment detection (platform-agnostic)
export const isProduction = process.env.NODE_ENV === 'production';