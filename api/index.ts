// Import the Express app from _src
import app from './_src/app';

// Add error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// For local development only
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 9999;
  const server = app.listen(port, () => {
    console.log(`✅ Server ready on port ${port}.`);
  });
  
  server.on('error', (error) => {
    console.error('❌ Server error:', error);
  });
  
  // Keep the process alive
  process.stdin.resume();
} else {
  // Production mode - exporting app for serverless
}

export default app;