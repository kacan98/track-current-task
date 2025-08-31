import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import * as readline from 'readline';
import { logger } from './utils/logger';

// Function to wait for user input before exit
function waitForUserExit(exitCode = 1) {
  console.log('\nPress Enter to exit...');
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.once('data', () => process.exit(exitCode));
}

// Set up early error handlers to prevent crashes during imports
process.on('uncaughtException', (error) => {
  try {
    logger.error('Uncaught Exception:', error.message || String(error));
    if (error.stack) {
      console.error(error.stack);
    }
    waitForUserExit(1);
  } catch {
    console.error('CRITICAL: Uncaught exception handler failed');
    waitForUserExit(1);
  }
});

process.on('unhandledRejection', (error) => {
  try {
    logger.error('Unhandled Promise Rejection:', String(error));
    waitForUserExit(1);
  } catch {
    console.error('CRITICAL: Unhandled rejection handler failed');
    waitForUserExit(1);
  }
});

// Import other modules after error handlers are set up
import { loadConfig } from './config/config-manager';
import { processAllRepositories } from './core/process-repositories';
import { logMonthlySummary } from './summary/log-monthly-summary';
import { logTodaySummary } from './summary/log-todays-summary';
import { formatLocalDateTime } from './utils/date-utils';
import { createCountdownSpinner } from './utils/spinner';
import { spinners } from './utils/spinners';
import { resolvePathFromAppData, getAppDataDirectory } from './utils/path-utils';

export const ACTIVITY_LOG_FILE_PATH = resolvePathFromAppData('activity_log.csv');
export const CONFIG_FILE_PATH = resolvePathFromAppData('config.json');
export const REPO_STATE_FILE_PATH = resolvePathFromAppData('repo_activity_state.json');

const STORAGE_FOLDER_PATH = getAppDataDirectory();

// Safely create storage directory
try {
  if (!existsSync(STORAGE_FOLDER_PATH)) {
    mkdirSync(STORAGE_FOLDER_PATH);
  }
} catch (error) {
  logger.error('Failed to create storage directory:', String(error));
  logger.error(`Attempted to create: ${STORAGE_FOLDER_PATH}`);
  waitForUserExit(1);
}

// Main entry point
async function main() {
  try {
    // CRITICAL: Prevent multiple instances to avoid infinite loops
    const lockFile = resolvePathFromAppData('.lock');
    if (existsSync(lockFile)) {
      try {
        const lockData = JSON.parse(readFileSync(lockFile, 'utf8'));
        const lockAge = Date.now() - lockData.timestamp;
        
        // If lock is less than 2 minutes old, another instance is probably running
        if (lockAge < 2 * 60 * 1000) {
          logger.warn('Another instance is already running (or recently started).');
          logger.info(`Lock file: ${lockFile}`);
          logger.info('Cannot start to prevent conflicts.');
          waitForUserExit(0);
          return;
        } else {
          logger.info('Stale lock file found - proceeding (lock was old)');
        }
      } catch {
        logger.info('Invalid lock file - proceeding');
      }
    }
    
    // Create lock file
    writeFileSync(lockFile, JSON.stringify({ 
      pid: process.pid, 
      timestamp: Date.now() 
    }));
    
    // Remove lock on exit
    const removeLock = () => {
      try {
        if (existsSync(lockFile)) {
          unlinkSync(lockFile);
        }
      } catch {
        // Ignore errors
      }
    };
    
    process.on('exit', removeLock);
    process.on('SIGINT', removeLock);
    process.on('SIGTERM', removeLock);
    
    logger.info('Git Activity Logger starting...');
    logger.info(`Data stored in: ${STORAGE_FOLDER_PATH}`);
    logger.info(`Config file: ${CONFIG_FILE_PATH}`);
    logger.info(`Activity log: ${ACTIVITY_LOG_FILE_PATH}`);
    
    const config = await loadConfig();

    if (config.repositories && config.repositories.length > 1) {
      logger.success(`Loaded config with ${config.repositories.length} repositories`);
    }

    // Set up intervals
      // Create countdown spinner instance
    const trackingIntervalMinutes = config.trackingIntervalMinutes;
    const waitingSpinner = createCountdownSpinner(
      'Waiting for next check... {time}', 
      trackingIntervalMinutes * 60, 
      { color: 'cyan', frames: spinners.material.frames, interval: spinners.material.interval }
    );
    
    // Function to run the check with timeout protection
    const runCheck = async (isInitialCheck = false) => {
      try {
        // Stop the waiting spinner before running check
        waitingSpinner.stopCountdown();
        
        // Add timeout protection to prevent hanging
        const timeoutMs = 120000; // 2 minutes timeout
        await Promise.race([
          processAllRepositories(config),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Repository processing timed out after ${timeoutMs/1000}s`)), timeoutMs)
          )
        ]);
        
        // Add a small delay on initial check to see the output before spinner starts
        if (isInitialCheck) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Start countdown spinner again after check is complete
        waitingSpinner.startCountdown();
      } catch (error) {
        logger.error('Error during repository check:', String(error));
        // Restart spinner even after error
        waitingSpinner.startCountdown();
      }
    };

    // Check immediately on startup
    logger.info(`[${formatLocalDateTime()}] Starting initial repository check...`);
    await runCheck(true);

    // Always display summary on startup
    await logMonthlySummary();
    
    // Set up the tracking interval
    const trackingInterval = setInterval(async () => {
      logger.info(`[${formatLocalDateTime()}] Checking repositories for changes...`);
      await runCheck();
      await logTodaySummary();
    }, trackingIntervalMinutes * 60 * 1000);

    logger.success('🚀 Git Activity Logger is now running.');
    logger.info(`While running, it will check for changes every ${trackingIntervalMinutes} minutes. Press Ctrl+C to stop.`);
    const cleanup = () => {
      logger.info('🛑 Stopping Git Activity Logger...');
      waitingSpinner.stopCountdown();
      clearInterval(trackingInterval);
      process.exit(0);
    };

    // Handle multiple ways the process might be terminated
    process.on('SIGINT', cleanup);     // Ctrl+C
    process.on('SIGTERM', cleanup);    // Termination signal
    process.on('SIGHUP', cleanup);     // Terminal closed
    
    // Windows-specific process termination
    if (process.platform === 'win32') {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.on('SIGINT', cleanup);
    }

  } catch (error: unknown) {
    const nodeError = error as Error;
    logger.error('Fatal error:', nodeError.message || String(nodeError));
    if (nodeError.stack) {
      console.error('\nStack trace:');
      console.error(nodeError.stack);
    }
    
    // Keep console open so user can see the error
    waitForUserExit(1);
  }
}

// Function to handle uncaught errors
function handleFatalError(error: unknown, origin: string) {
  try {
    const nodeError = error as Error;
    logger.error(`${origin}:`, nodeError.message || String(nodeError));
    if (nodeError.stack) {
      console.error('\nStack trace:');
      console.error(nodeError.stack);
    }
    
    waitForUserExit(1);
  } catch (handlerError) {
    // Even the error handler failed - this is really bad
    console.error('CRITICAL: Error handler itself failed:', handlerError);
    waitForUserExit(1);
  }
}

// Start the application
main().catch((error) => {
  handleFatalError(error, 'Main function error');
});
