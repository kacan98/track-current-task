// API configuration
// In production (Vercel), the API runs on the same domain
// In development, we need to proxy to the backend server

export const getApiBaseUrl = () => {
  // In production, use relative URLs (same domain)
  if (import.meta.env.PROD) {
    return '';
  }
  
  // In development, Vite proxy handles /api routes
  // This is configured in vite.config.ts
  return '';
};

export const API_BASE_URL = getApiBaseUrl();