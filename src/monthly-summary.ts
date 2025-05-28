import { readFile } from 'fs/promises';
import { Config } from './config.types';
import { LogEntry } from './index';
import chalk from 'chalk';

// Enhance LogEntry with date object and week information
interface EnhancedLogEntry extends LogEntry {
  dateObj: Date;
  weekNumber: number;
}

// Utility types for grouping data
type TaskSummary = Record<string, number>;
type WeeklyEntries = Record<number, EnhancedLogEntry[]>;
type DailyEntries = Record<string, EnhancedLogEntry[]>;

// Parse log file entries and enhance with date info
async function readLogFile(filePath: string): Promise<EnhancedLogEntry[]> {
  try {
    const data = await readFile(filePath, 'utf-8');
    const lines = data.trim().split('\n');
    
    if (lines.length <= 1) return []; // Empty or only header
    
    // Skip header row, parse the rest
    return lines.slice(1).map(line => {
      const [date, taskId, hoursStr] = line.split(',');
      const dateObj = new Date(date);
      
      // Calculate week number (1-based) within the month
      const firstDayOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
      const firstDayWeekday = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayOfMonth = dateObj.getDate();
      const weekNumber = Math.ceil((dayOfMonth + firstDayWeekday) / 7);
      
      return { 
        date, taskId, hours: parseFloat(hoursStr), dateObj, weekNumber
      };
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') return []; // File not found
    console.error(`Error reading log file ${filePath}:`, error);
    return [];
  }
}

// Load configuration from config.json
async function loadConfig(): Promise<Config> {
  try {
    const configData = await readFile('./config.json', 'utf-8');
    return JSON.parse(configData) as Config;
  } catch (error: any) {
    console.error('Error loading config:', error.message);
    process.exit(1);
  }
}

// Format hours as "Xh Ym"
function formatHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
}

// Date utilities
function getMonthDateRange(year: number, month: number) {
  // First day of month
  const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  
  // Last day of month (get first day of next month, then subtract one day)
  const lastDay = new Date(year, month + 1, 0);
  const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  
  return { firstDay, lastDayStr };
}

// Format date range for week display
function formatWeekRange(weekStart: Date, weekEnd: Date): string {
  const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startStr} - ${endStr}`;
}

// Calculate and print task summary
function printTaskSummary(entries: EnhancedLogEntry[], indent = ''): number {
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

// Print daily details with task breakdown
function printDailyDetails(entriesForWeek: EnhancedLogEntry[]) {
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

// Print weekly breakdown with task summary and daily details
function printWeeklyBreakdown(entries: EnhancedLogEntry[]) {
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

// Print month summary
function printMonthSummary(entries: EnhancedLogEntry[], year: number, monthName: string, isPrevious = false) {
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

// Main function to generate the monthly summary
async function generateMonthlySummary() {
  console.log(chalk.cyan.bold('===================================='));
  console.log(chalk.cyan.bold('       MONTHLY TIME SUMMARY'));
  console.log(chalk.cyan.bold('===================================='));
  
  const config = await loadConfig();
  const entries = await readLogFile(config.logFilePath);
  
  if (entries.length === 0) {
    console.log(chalk.yellow('No entries found in the log file.'));
    return;
  }
  
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
    entry => entry.date >= currentMonthStart && entry.date <= currentMonthEnd
  );
  
  // Get month names
  const currentMonthName = new Date(currentMonthStart).toLocaleString('default', { month: 'long' });
  
  // Print current month summary
  printMonthSummary(currentMonthEntries, currentYear, currentMonthName);
  
  // Show previous month if we're in the first week of the current month
  if (showPreviousMonth) {
    const prevMonthEntries = entries.filter(
      entry => entry.date >= prevMonthStart && entry.date <= prevMonthEnd
    );
    
    const prevMonthName = new Date(prevMonthStart).toLocaleString('default', { month: 'long' });
    printMonthSummary(prevMonthEntries, prevYear, prevMonthName, true);
  }
  
  console.log(chalk.cyan.bold('\n===================================='));
}

// Run the summary
generateMonthlySummary().catch((error: unknown) => {
  console.error('Error generating monthly summary:', error);
  process.exit(1);
});
