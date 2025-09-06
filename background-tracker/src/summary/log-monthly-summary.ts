import { loadConfig } from '../config/config-manager';
import { EnhancedLogEntry, getLogEntries as coreGetLogEntries, enhanceLogEntries } from '../core/file-operations';
import { getMonthDateRange } from '../utils/date-utils';
import { logMonthSummary } from './summary-report-formatters';
import { logger } from '../shared/logger';

// Utility types for grouping data
// type TaskSummary = Record<string, number>;
// type WeeklyEntries = Record<number, EnhancedLogEntry[]>;
// type DailyEntries = Record<string, EnhancedLogEntry[]>;

// Parse log file entries and enhance with date info
// Local helper function to get enhanced log entries
async function getLogFile(): Promise<EnhancedLogEntry[]> {
  const basicEntries = await coreGetLogEntries();
  return enhanceLogEntries(basicEntries);
}

// Main function to generate the monthly summary
export async function logMonthlySummary() {
  const config = await loadConfig();
  const entries = await getLogFile();

  if (entries.length === 0) {
    return;
  }

  logger.info('\n\n====================================');
  logger.info('       MONTHLY TIME SUMMARY');
  logger.info('====================================');

  // Get current date details
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const dayOfMonth = now.getDate();

  // Determine whether to show previous month too (if within first 7 days of month)
  const showPreviousMonth = dayOfMonth <= 7;

  // Get date ranges for current month
  const { firstDay: currentMonthStart, lastDayStr: currentMonthEnd } =
    getMonthDateRange(currentYear, currentMonth);

  // Calculate previous month details
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const { firstDay: prevMonthStart, lastDayStr: prevMonthEnd } =
    getMonthDateRange(prevYear, prevMonth);
  // Filter entries for current month
  const currentMonthEntries = entries.filter(
    (entry: EnhancedLogEntry) => entry.date >= currentMonthStart && entry.date <= currentMonthEnd
  );
  // Get month names
  const currentMonthName = new Date(currentMonthStart).toLocaleString('default', { month: 'long' });  // Print current month summary
  logMonthSummary(currentMonthEntries, currentYear, currentMonthName, config);
  
  let _allDisplayedEntries = [...currentMonthEntries];
  
  // Show previous month if we're in the first week of the current month
  if (showPreviousMonth) {
    const prevMonthEntries = entries.filter(
      (entry: EnhancedLogEntry) => entry.date >= prevMonthStart && entry.date <= prevMonthEnd
    );

    const prevMonthName = new Date(prevMonthStart).toLocaleString('default', { month: 'long' });
    logMonthSummary(prevMonthEntries, prevYear, prevMonthName, config, true);
    _allDisplayedEntries = [..._allDisplayedEntries, ...prevMonthEntries];
  }

  logger.info('\n====================================');
}
