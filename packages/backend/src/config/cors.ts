// Get allowed origins (Vercel-aware and dev-safe)
export const getAllowedOrigins = () => {
    if (process.env.DEV === 'true') {
        // Development mode - allow localhost
        return ['http://localhost:5173'];
    }
    
    if (process.env.VERCEL_URL) {
        // Running on Vercel - use the automatic URL
        return [`https://${process.env.VERCEL_URL}`];
    }
    
    // No valid frontend origin found
    throw new Error('No frontend origin configured. Set DEV=true for development or deploy to Vercel for production.');
};

// Environment detection using Vercel's variables
export const isProduction = process.env.VERCEL_ENV === 'production';