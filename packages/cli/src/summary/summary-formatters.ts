import { Config } from '../config/config-types';
import { EnhancedLogEntry } from '../core/file-operations';
import { getFormattedHours } from '../utils/date-utils';
import { logger } from '@shared/logger';

// Utility types for grouping data
type DailyEntries = Record<string, EnhancedLogEntry[]>;

/**
 * Calculate and print task summary
 * Returns the total hours
 */
export function printTaskSummary(entries: EnhancedLogEntry[], config: Config, indent = ''): number {
  const taskSummary: Record<string, { hours: number; repository: string }> = {};
  let totalHours = 0;
  
  // Group hours by task, keeping track of repository
  entries.forEach(entry => {
    const key = `${entry.taskId}|${entry.repository}`;
    if (!taskSummary[key]) {
      taskSummary[key] = { hours: 0, repository: entry.repository };
    }
    taskSummary[key].hours += entry.hours;
    totalHours += entry.hours;
  });
    // Print task breakdown sorted by hours (most to least)
  Object.entries(taskSummary)
    .sort(([, dataA], [, dataB]) => dataB.hours - dataA.hours).forEach(([key, data]) => {
      const [taskId] = key.split('|');
      const percentage = totalHours > 0 ? (data.hours / totalHours * 100).toFixed(1) : '0.0';
      
      logger.info(`${indent}${taskId} (${data.repository}): ${getFormattedHours(data.hours)} (${percentage}%)`);
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
      logger.info(`    ${formattedDate}: ${getFormattedHours(dailyHours)}`);
      
      // Print tasks for each day
    printTaskSummary(entriesForDay, config, '      ');
  });
    return days.length;
}
