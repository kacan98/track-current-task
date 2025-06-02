import chalk from 'chalk';
import { EnhancedLogEntry } from '../core/file-operations';
import { formatWeekRange, formatHours } from '../utils/date-utils';
import { printTaskSummary, printDailyDetails } from './summary-formatters';

// Utility types for grouping data
type WeeklyEntries = Record<number, EnhancedLogEntry[]>;

/**
 * Print weekly breakdown with task summary and daily details
 */
export function printWeeklyBreakdown(entries: EnhancedLogEntry[]) {
  // Group entries by week
  const weeklyEntries: WeeklyEntries = {};
  entries.forEach(entry => {
    if (!weeklyEntries[entry.weekNumber]) weeklyEntries[entry.weekNumber] = [];
    weeklyEntries[entry.weekNumber].push(entry);
  });
  
  // Sort and process weeks
  Object.entries(weeklyEntries)
    .sort(([weekA], [weekB]) => parseInt(weekA) - parseInt(weekB))
    .forEach(([weekNum, entriesForWeek]) => {
      // Calculate week date range (Sunday to Saturday)
      const anyDateInWeek = entriesForWeek[0].dateObj;
      
      // Get start of week (Sunday)
      const weekStart = new Date(anyDateInWeek);
      weekStart.setDate(anyDateInWeek.getDate() - anyDateInWeek.getDay());
      
      // Get end of week (Saturday)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Calculate total hours for the week
      const weeklyHours = entriesForWeek.reduce((sum, entry) => sum + entry.hours, 0);
      
      // Print week header with date range
      console.log(chalk.magenta.bold(`\n  ${formatWeekRange(weekStart, weekEnd)} (Week ${weekNum}): ${chalk.yellow(formatHours(weeklyHours))}`));
      
      // Print task breakdown for the week
      printTaskSummary(entriesForWeek, '    ');
      
      // Print daily details
      console.log(chalk.blue(`    Daily Details:`));
      printDailyDetails(entriesForWeek);
    });
}

/**
 * Print month summary
 */
export function printMonthSummary(entries: EnhancedLogEntry[], year: number, monthName: string, isPrevious = false) {
  const title = isPrevious ? `${monthName} ${year} (Previous Month):` : `${monthName} ${year}:`;
  console.log(chalk.green.bold(`\n${title}`));
  
  if (entries.length === 0) {
    console.log(chalk.yellow('  No entries found for this month.'));
    return;
  }
  
  // Print task summary
  const totalHours = printTaskSummary(entries, '  ');
  console.log(chalk.green.bold(`\n  Total Hours: ${formatHours(totalHours)}`));
  
  // For current month, print weekly breakdown
  if (!isPrevious) {
    console.log(chalk.blue.bold('\n  Weekly Breakdown:'));
    printWeeklyBreakdown(entries);
  } else {
    // For previous month, just show a note
    console.log(chalk.gray('\n  Note: Detailed weekly breakdown is shown for current month only.'));
  }
}
