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
    console.log(chalk.cyan.bold('Git Activity Logger starting...'));
    const config = await loadConfig();

    if (config.repositories.length > 1) {
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
    
    // Function to run the check
    const runCheck = async () => {
      try {
        // Stop the waiting spinner before running check
        waitingSpinner.stopCountdown();
        
        await processAllRepositories(config);
        
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
    await runCheck();

    // Always display summary on startup
    await logMonthlySummary();
    
    // Set up the tracking interval
    const trackingInterval = setInterval(async () => {
      console.log(chalk.blue(`\n[${formatLocalDateTime()}] Checking repositories for changes...`));
      await runCheck();
      await logTodaySummary();
    }, trackingIntervalMinutes * 60 * 1000);

    console.log(chalk.blue.bold(`\n🚀 Git Activity Logger is now running.`));
    console.log(chalk.blue(`While running, it will check for changes every ${chalk.whiteBright(trackingIntervalMinutes)} minutes. Press Ctrl+C to stop.`));    // Keep the process running
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n🛑 Stopping Git Activity Logger...'));
      waitingSpinner.stopCountdown();
      clearInterval(trackingInterval);
      process.exit(0);
    });

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Start the application
main();
