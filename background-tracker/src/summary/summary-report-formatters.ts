import { Config } from '../config/config-types';
import { EnhancedLogEntry } from '../core/file-operations';
import { getFormattedWeekRange, getFormattedHours } from '../utils/date-utils';
import { printTaskSummary, renderDailyDetails } from './summary-formatters';
import { logger } from '../shared/logger';
import { colors } from '../shared/colors';

// Utility types for grouping data
type WeeklyEntries = Record<number, EnhancedLogEntry[]>;

/**
 * Generate weekly breakdown with task summary and daily details
 * @param entries Log entries to process
 * @param config Configuration object containing taskTrackingUrl
 * @returns Number of weeks rendered
 */
export function generateWeeklyBreakdown(entries: EnhancedLogEntry[], config: Config): number {
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
        const weekRange = colors.primary.bold(getFormattedWeekRange(weekStart, weekEnd));
        const weekLabel = colors.muted(`(Week ${weekNum})`);
        const weeklyHoursDisplay = colors.success.bold(getFormattedHours(weeklyHours));
        
        logger.info(`\n  ${weekRange} ${weekLabel}: ${weeklyHoursDisplay}`);
        // Print task breakdown for the week
        printTaskSummary(entriesForWeek, config, '    ');
        // Print daily details
        logger.info(`\n    ${colors.muted('Daily Details:')}`);
        renderDailyDetails(entriesForWeek, config);
    });

    return weeks.length;
}

/**
 * Generate month summary with task breakdown
 * @param entries Log entries for the month
 * @param year Year of the month
 * @param monthName Name of the month
 * @param config Configuration object containing taskTrackingUrl
 * @param isPrevious Whether this is the previous month
 * @returns Total hours logged for the month
 */
export function logMonthSummary(entries: EnhancedLogEntry[], year: number, monthName: string, config: Config, isPrevious = false): void {
    if (entries.length === 0 && !isPrevious) {
        const title = isPrevious ? `${monthName} ${year} (Previous Month):` : `${monthName} ${year}:`;
        logger.info(`\n${title}`);
        logger.warn('  No entries found for this month.');
        return
    }
    
    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
    if (totalHours > 0) {
        const totalDisplay = colors.success.bold(getFormattedHours(totalHours));
        logger.success(`Total Hours: ${totalDisplay}`);
    }

    generateWeeklyBreakdown(entries, config);
}
