import chalk from 'chalk';
import { loadConfig } from '../config/config-manager';
import { getLogEntries } from '../core/file-operations';
import { formatLocalDateTime, generateTaskUrl } from '../utils/date-utils';

/**
 * Get and display today's summary of logged hours
 * @returns The total hours logged today
 */
export async function logTodaySummary(): Promise<number> {
  const config = await loadConfig();
  const entries = await getLogEntries();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Filter entries for today
  const todayEntries = entries.filter(entry => entry.date === today);

  if (todayEntries.length === 0) {
    console.log(chalk.blue(`\n\n[${formatLocalDateTime()}] Today's Summary: ${chalk.yellow('No time logged yet today.')}\n\n`));
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
  console.log(chalk.blue(`\n\n[${formatLocalDateTime()}] Today's Summary:`));
    Object.entries(taskSummary)
    .sort(([, hoursA], [, hoursB]) => hoursB - hoursA) // Sort by hours descending
    .forEach(([taskId, hours]) => {
      const taskUrl = generateTaskUrl(taskId, config.taskTrackingUrl);
      
      let taskDisplay = chalk.cyan(taskId);
      if (taskUrl) {
        taskDisplay = chalk.cyan(taskId) + chalk.gray(` → ${taskUrl}`);
      }
      
      console.log(chalk.green(`  • ${taskDisplay}: ${chalk.yellow(hours.toFixed(2))} hours`));
    });
    console.log(chalk.blue(`  ${chalk.white.bold('Total')}: ${chalk.yellow.bold(totalHours.toFixed(2))} hours\n\n`));
  
  return totalHours;
}
