import chalk from 'chalk';
import { existsSync, mkdirSync } from 'fs';
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

if (!existsSync(STORAGE_FOLDER_PATH)) {
  mkdirSync(STORAGE_FOLDER_PATH);
}

// Main entry point
async function main() {
  try {
    // CRITICAL: Prevent multiple instances to avoid infinite loops
    const lockFile = resolvePathFromAppData('.lock');
    if (existsSync(lockFile)) {
      try {
        const lockData = JSON.parse(require('fs').readFileSync(lockFile, 'utf8'));
        const lockAge = Date.now() - lockData.timestamp;
        
        // If lock is less than 2 minutes old, another instance is probably running
        if (lockAge < 2 * 60 * 1000) {
          console.log(chalk.yellow('⚠️  Another instance is already running (or recently started).'));
          console.log(chalk.gray(`Lock file: ${lockFile}`));
          console.log(chalk.gray('Exiting to prevent conflicts...'));
          process.exit(0);
        } else {
          console.log(chalk.gray('Stale lock file found - proceeding (lock was old)'));
        }
      } catch (error) {
        console.log(chalk.gray('Invalid lock file - proceeding'));
      }
    }
    
    // Create lock file
    require('fs').writeFileSync(lockFile, JSON.stringify({ 
      pid: process.pid, 
      timestamp: Date.now() 
    }));
    
    // Remove lock on exit
    const removeLock = () => {
      try {
        if (existsSync(lockFile)) {
          require('fs').unlinkSync(lockFile);
        }
      } catch (e) {
        // Ignore errors
      }
    };
    
    process.on('exit', removeLock);
    process.on('SIGINT', removeLock);
    process.on('SIGTERM', removeLock);
    
    console.log(chalk.cyan.bold('Git Activity Logger starting...'));
    console.log(chalk.gray(`Data stored in: ${STORAGE_FOLDER_PATH}`));
    console.log(chalk.gray(`Config file: ${CONFIG_FILE_PATH}`));
    console.log(chalk.gray(`Activity log: ${ACTIVITY_LOG_FILE_PATH}\n`));
    
    const config = await loadConfig();

    if (config.repositories && config.repositories.length > 1) {
      console.log(chalk.green(`Loaded config` + `with ${chalk.white.bold(config.repositories.length)} repositories`));
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
        console.error(chalk.red('Error during repository check:'), error);
        // Restart spinner even after error
        waitingSpinner.startCountdown();
      }
    };

    // Check immediately on startup
    console.log(chalk.blue(`\n[${formatLocalDateTime()}] Starting initial repository check...`));
    await runCheck(true);

    // Always display summary on startup
    await logMonthlySummary();
    
    // Set up the tracking interval
    const trackingInterval = setInterval(async () => {
      console.log(chalk.blue(`\n[${formatLocalDateTime()}] Checking repositories for changes...`));
      await runCheck();
      await logTodaySummary();
    }, trackingIntervalMinutes * 60 * 1000);

    console.log(chalk.blue.bold(`\n🚀 Git Activity Logger is now running.`));
    console.log(chalk.blue(`While running, it will check for changes every ${chalk.whiteBright(trackingIntervalMinutes)} minutes. Press Ctrl+C to stop.`));    // Keep the process running with multiple exit handlers
    const cleanup = () => {
      console.log(chalk.yellow('\n🛑 Stopping Git Activity Logger...'));
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
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.on('SIGINT', cleanup);
    }

  } catch (error: any) {
    console.error(chalk.red('\n❌ Fatal error:'), error.message || error);
    if (error.stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }
    
    // Keep console open so user can see the error
    console.log(chalk.yellow('\nPress Enter to exit...'));
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', () => {
      process.exit(1);
    });
  }
}

// Function to handle uncaught errors
function handleFatalError(error: any, origin: string) {
  console.error(chalk.red(`\n❌ ${origin}:`), error.message || error);
  if (error.stack) {
    console.error(chalk.gray('\nStack trace:'));
    console.error(chalk.gray(error.stack));
  }
  
  console.log(chalk.yellow('\nPress Enter to exit...'));
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.once('data', () => {
    process.exit(1);
  });
}

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => handleFatalError(error, 'Uncaught Exception'));
process.on('unhandledRejection', (error) => handleFatalError(error, 'Unhandled Promise Rejection'));

// Start the application
main().catch((error) => {
  handleFatalError(error, 'Main function error');
});
