import chalk from 'chalk';
import { Config } from '../config/config-types';
import { readLogFile } from '../core/file-operations';
import { formatLocalDateTime } from '../utils/date-utils';

// Function to display today's summary
export async function displayTodaySummary(config: Config) {
  const entries = await readLogFile(config.logFilePath);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Filter entries for today
  const todayEntries = entries.filter(entry => entry.date === today);

  if (todayEntries.length === 0) {
    console.log(chalk.blue(`\n[${formatLocalDateTime()}] Today's Summary: ${chalk.yellow('No time logged yet today.')}`));
    return;
  }
  
  // Group by task ID and sum hours
  const taskSummary: Record<string, number> = {};
  let totalHours = 0;
  
  todayEntries.forEach(entry => {
    taskSummary[entry.taskId] = (taskSummary[entry.taskId] || 0) + entry.hours;
    totalHours += entry.hours;
  });
  
  // Display summary
  console.log(chalk.blue(`\n[${formatLocalDateTime()}] Today's Summary:`));
  
  Object.entries(taskSummary)
    .sort(([, hoursA], [, hoursB]) => hoursB - hoursA) // Sort by hours descending
    .forEach(([taskId, hours]) => {
      console.log(chalk.green(`  • ${chalk.cyan(taskId)}: ${chalk.yellow(hours.toFixed(2))} hours`));
    });
  
  console.log(chalk.blue(`  ${chalk.white.bold('Total')}: ${chalk.yellow.bold(totalHours.toFixed(2))} hours`));
}
