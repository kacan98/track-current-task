import chalk from 'chalk';
import { EnhancedLogEntry } from '../core/file-operations';
import { getFormattedWeekRange, getFormattedHours } from '../utils/date-utils';
import { printTaskSummary, renderDailyDetails } from './summary-formatters';

// Utility types for grouping data
type WeeklyEntries = Record<number, EnhancedLogEntry[]>;

/**
 * Generate weekly breakdown with task summary and daily details
 * @param entries Log entries to process
 * @returns Number of weeks rendered
 */
export function generateWeeklyBreakdown(entries: EnhancedLogEntry[]): number {
    // Group entries by week
    const weeklyEntries: WeeklyEntries = {};
    entries.forEach(entry => {
        if (!weeklyEntries[entry.weekNumber]) weeklyEntries[entry.weekNumber] = [];
        weeklyEntries[entry.weekNumber].push(entry);
    });

    const weeks = Object.entries(weeklyEntries)
        .sort(([weekA], [weekB]) => parseInt(weekA) - parseInt(weekB));

    // Process weeks
    weeks.forEach(([weekNum, entriesForWeek]) => {
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
        console.log(chalk.magenta.bold(`\n  ${getFormattedWeekRange(weekStart, weekEnd)} (Week ${weekNum}): ${chalk.yellow(getFormattedHours(weeklyHours))}`));

        // Print task breakdown for the week
        printTaskSummary(entriesForWeek, '    ');
        // Print daily details
        console.log(chalk.blue(`\n    Daily Details:`));
        renderDailyDetails(entriesForWeek);
    });

    return weeks.length;
}

/**
 * Generate month summary with task breakdown
 * @param entries Log entries for the month
 * @param year Year of the month
 * @param monthName Name of the month
 * @param isPrevious Whether this is the previous month
 * @returns Total hours logged for the month
 */
export function logMonthSummary(entries: EnhancedLogEntry[], year: number, monthName: string, isPrevious = false): void {
    if (entries.length === 0 && !isPrevious) {
        const title = isPrevious ? `${monthName} ${year} (Previous Month):` : `${monthName} ${year}:`;
        console.log(chalk.green.bold(`\n${title}`));
        console.log(chalk.yellow('  No entries found for this month.'));
        return
    }
    
    // const totalHours = printTaskSummary(entries, '  ');
    // console.log(chalk.green.bold(`\n  Total Hours: ${getFormattedHours(totalHours)}`));

    generateWeeklyBreakdown(entries);
}
