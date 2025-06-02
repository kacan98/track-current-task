import chalk from 'chalk';
import { Config } from '../config/config-types';
import { getLogEntries } from '../core/file-operations';
import { formatLocalDateTime } from '../utils/date-utils';

/**
 * Get and display today's summary of logged hours
 * @param config Application configuration
 * @returns The total hours logged today
 */
export async function logTodaySummary(config: Config): Promise<number> {
  const entries = await getLogEntries(config.logFilePath);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Filter entries for today
  const todayEntries = entries.filter(entry => entry.date === today);

  if (todayEntries.length === 0) {
    console.log(chalk.blue(`\n[${formatLocalDateTime()}] Today's Summary: ${chalk.yellow('No time logged yet today.')}`));
    return 0;
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
  
  return totalHours;
}
