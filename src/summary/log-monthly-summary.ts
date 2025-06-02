import chalk from 'chalk';
import { loadConfig } from '../config/config-manager';
import { EnhancedLogEntry, getLogEntries as coreGetLogEntries, enhanceLogEntries } from '../core/file-operations';
import { getMonthDateRange } from '../utils/date-utils';
import { logMonthSummary } from './summary-report-formatters';

// Utility types for grouping data
type TaskSummary = Record<string, number>;
type WeeklyEntries = Record<number, EnhancedLogEntry[]>;
type DailyEntries = Record<string, EnhancedLogEntry[]>;

// Parse log file entries and enhance with date info
// Local helper function to get enhanced log entries
async function getLogFile(filePath: string): Promise<EnhancedLogEntry[]> {
  const basicEntries = await coreGetLogEntries(filePath);
  return enhanceLogEntries(basicEntries);
}

// Main function to generate the monthly summary
export async function logMonthlySummary() {
  const config = await loadConfig();
  const entries = await getLogFile(config.logFilePath);

  if (entries.length === 0) {
    console.log(chalk.yellow('No entries found in the log file.'));
    return;
  }

  console.log(chalk.cyan.bold('===================================='));
  console.log(chalk.cyan.bold('       MONTHLY TIME SUMMARY')); console.log(chalk.cyan.bold('===================================='));

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
  const currentMonthName = new Date(currentMonthStart).toLocaleString('default', { month: 'long' });

  // Print current month summary
  logMonthSummary(currentMonthEntries, currentYear, currentMonthName);
  // Show previous month if we're in the first week of the current month
  if (showPreviousMonth) {
    const prevMonthEntries = entries.filter(
      (entry: EnhancedLogEntry) => entry.date >= prevMonthStart && entry.date <= prevMonthEnd
    );

    const prevMonthName = new Date(prevMonthStart).toLocaleString('default', { month: 'long' });
    logMonthSummary(prevMonthEntries, prevYear, prevMonthName, true);
  }

  console.log(chalk.cyan.bold('\n===================================='));
}
