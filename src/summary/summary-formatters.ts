import chalk from 'chalk';
import { EnhancedLogEntry } from '../core/file-operations';
import { formatHours } from '../utils/date-utils';

// Utility types for grouping data
type TaskSummary = Record<string, number>;
type DailyEntries = Record<string, EnhancedLogEntry[]>;

/**
 * Calculate and print task summary
 * Returns the total hours
 */
export function printTaskSummary(entries: EnhancedLogEntry[], indent = ''): number {
  const taskSummary: TaskSummary = {};
  let totalHours = 0;
  
  // Group hours by task
  entries.forEach(entry => {
    taskSummary[entry.taskId] = (taskSummary[entry.taskId] || 0) + entry.hours;
    totalHours += entry.hours;
  });
  
  // Print task breakdown sorted by hours (most to least)
  Object.entries(taskSummary)
    .sort(([, hoursA], [, hoursB]) => hoursB - hoursA)
    .forEach(([taskId, hours]) => {
      const percentage = totalHours > 0 ? (hours / totalHours * 100).toFixed(1) : '0.0';
      console.log(`${indent}${chalk.cyan(taskId)}: ${chalk.yellow(formatHours(hours))} (${percentage}%)`);
    });
  
  return totalHours;
}

/**
 * Print daily details with task breakdown
 */
export function printDailyDetails(entriesForWeek: EnhancedLogEntry[]) {
  // Group entries by day
  const dailyEntries: DailyEntries = {};
  entriesForWeek.forEach(entry => {
    if (!dailyEntries[entry.date]) dailyEntries[entry.date] = [];
    dailyEntries[entry.date].push(entry);
  });
  
  // Print daily breakdown with tasks
  Object.entries(dailyEntries)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .forEach(([date, entriesForDay]) => {
      const dateObj = new Date(date);
      const formattedDate = dateObj.toLocaleDateString('en-US', { 
        weekday: 'short', month: 'short', day: 'numeric' 
      });
      
      const dailyHours = entriesForDay.reduce((sum, entry) => sum + entry.hours, 0);
      console.log(`    ${chalk.cyan(formattedDate)}: ${chalk.yellow(formatHours(dailyHours))}`);
      
      // Print tasks for each day
      printTaskSummary(entriesForDay, '      ');
    });
}
