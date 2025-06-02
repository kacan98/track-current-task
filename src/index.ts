import chalk from 'chalk';
import { Config } from './config/config-types';
import { loadConfig } from './config/config-manager';
import { processAllRepositories } from './core/process-repositories';
import { getTodaysSummary } from './summary/display-todays-summary';
import { formatLocalDateTime } from './utils/date-utils';

// Main entry point
async function main() {
  try {
    console.log(chalk.cyan.bold('Git Activity Logger starting...'));
    const config = await loadConfig();

    console.log(chalk.green(`Loaded config with ${chalk.white.bold(config.repositories.length)} repositories`));
    
    // Set up intervals
    const trackingIntervalMinutes = config.trackingIntervalMinutes;
    
    console.log(chalk.blue.bold(`Running with the following intervals:`));
    console.log(chalk.yellow(`- Tracking interval: ${chalk.white(trackingIntervalMinutes.toString())} minutes (how often we check for changes)`));    
    // Always display summary on startup
    await getTodaysSummary(config);
    
    // Function to run the check
    const runCheck = async () => {
      try {
        await processAllRepositories(config);
      } catch (error) {
        console.error(chalk.red('Error during repository check:'), error);
      }
    };
    
    // Check immediately on startup
    console.log(chalk.blue(`\n[${formatLocalDateTime()}] Starting initial repository check...`));
    await runCheck();
    
    // Set up the tracking interval
    const trackingInterval = setInterval(async () => {
      console.log(chalk.blue(`\n[${formatLocalDateTime()}] Checking repositories for changes...`));
      await runCheck();
    }, trackingIntervalMinutes * 60 * 1000);
    
    // Set up daily summary display (every hour on the hour)
    const now = new Date();
    const msUntilNextHour = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();
      setTimeout(() => {
      // Display summary immediately when we hit the hour
      getTodaysSummary(config);
      
      // Then set up interval to display every hour
      setInterval(() => {
        getTodaysSummary(config);
      }, 60 * 60 * 1000);
    }, msUntilNextHour);
    
    console.log(chalk.blue.bold(`\n🚀 Git Activity Logger is now running. Press Ctrl+C to stop.`));
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n📝 Stopping Git Activity Logger...'));
      clearInterval(trackingInterval);
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main();
}
