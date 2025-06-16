import chalk from 'chalk';
import { Config } from '../config/config-types';
import { EnhancedLogEntry } from '../core/file-operations';
import { getFormattedHours, generateTaskUrl } from '../utils/date-utils';

// Utility types for grouping data
type TaskSummary = Record<string, number>;
type DailyEntries = Record<string, EnhancedLogEntry[]>;

/**
 * Calculate and print task summary
 * Returns the total hours
 */
export function printTaskSummary(entries: EnhancedLogEntry[], config: Config, indent = ''): number {
  const taskSummary: TaskSummary = {};
  let totalHours = 0;
  
  // Group hours by task
  entries.forEach(entry => {
    taskSummary[entry.taskId] = (taskSummary[entry.taskId] || 0) + entry.hours;
    totalHours += entry.hours;
  });
    // Print task breakdown sorted by hours (most to least)
  Object.entries(taskSummary)
    .sort(([, hoursA], [, hoursB]) => hoursB - hoursA).forEach(([taskId, hours]) => {
      const percentage = totalHours > 0 ? (hours / totalHours * 100).toFixed(1) : '0.0';
      const taskUrl = generateTaskUrl(taskId, config.taskTrackingUrl);
      
      let taskDisplay = chalk.cyan(taskId);
      if (taskUrl) {
        // Display URL in a PowerShell-friendly way
        taskDisplay = chalk.cyan(taskId) + chalk.gray(` → ${taskUrl}`);
      }
      
      console.log(`${indent}${taskDisplay}: ${chalk.yellow(getFormattedHours(hours))} (${percentage}%)`);
    });
  
  return totalHours;
}

/**
 * Render daily details with task breakdown
 * @param entriesForWeek Entries for a specific week
 * @param config Configuration object containing taskTrackingUrl
 * @returns Total number of days rendered
 */
export function renderDailyDetails(entriesForWeek: EnhancedLogEntry[], config: Config): number {
  // Group entries by day
  const dailyEntries: DailyEntries = {};
  entriesForWeek.forEach(entry => {
    if (!dailyEntries[entry.date]) dailyEntries[entry.date] = [];
    dailyEntries[entry.date].push(entry);
  });
  
  const days = Object.entries(dailyEntries)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
  
  // Print daily breakdown with tasks
  days.forEach(([date, entriesForDay]) => {      const dateObj = new Date(date);
      const formattedDate = dateObj.toLocaleDateString('en-US', { 
        weekday: 'short', month: 'short', day: 'numeric' 
      });
      
      const dailyHours = entriesForDay.reduce((sum, entry) => sum + entry.hours, 0);
      console.log(`    ${chalk.cyan(formattedDate)}: ${chalk.yellow(getFormattedHours(dailyHours))}`);
      
      // Print tasks for each day
    printTaskSummary(entriesForDay, config, '      ');
  });
    return days.length;
}
