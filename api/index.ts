console.log('🚀 Starting API server...');

// Import the Express app from _src
import app from './_src/app';

// For local development only
if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log("Server ready on port 3000."));
}

module.exports = app;