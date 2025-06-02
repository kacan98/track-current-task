import { readFile, writeFile } from 'fs/promises';
import { REPO_STATE_FILE_PATH } from '..';
import { RepoState } from './repo-state-types';

export interface LogEntry {
  date: string; // YYYY-MM-DD
  taskId: string;
  hours: number;
}

// Enhanced log entry with date object and week information
export interface EnhancedLogEntry extends LogEntry {
  dateObj: Date;
  weekNumber: number;
}

/**
 * Get log entries from log file
 * @param filePath Path to the log file
 * @returns Array of log entries
 */
export async function getLogEntries(filePath: string): Promise<LogEntry[]> {
  try {
    const data = await readFile(filePath, 'utf-8');
    const lines = data.trim().split('\n');
    if (lines.length <= 1) {
      return []; // Empty or only header
    }
    // Skip header row, parse the rest
    return lines.slice(1).map(line => {
      const [date, taskId, hoursStr] = line.split(',');
      return { date, taskId, hours: parseFloat(hoursStr) };
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return []; // File not found, return empty array
    }
    console.error(`Error reading log file ${filePath}:`, error);
    return [];
  }
}

/**
 * Enhances log entries with date objects and week numbers
 * @param entries Basic log entries
 * @returns Enhanced log entries with date objects and week numbers
 */
export function enhanceLogEntries(entries: LogEntry[]): EnhancedLogEntry[] {
  return entries.map(entry => {
    const dateObj = new Date(entry.date);
    
    // Calculate week number (1-based) within the month
    const firstDayOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
    const firstDayWeekday = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayOfMonth = dateObj.getDate();
    const weekNumber = Math.ceil((dayOfMonth + firstDayWeekday) / 7);
    
    return { 
      ...entry,
      dateObj,
      weekNumber
    };
  });
}

/**
 * Write log entries to the log file
 * @param filePath Path to the log file
 * @param entries Log entries to write
 * @returns True if successful, false otherwise
 */
export async function writeLogFile(filePath: string, entries: LogEntry[]): Promise<boolean> {
  try {
    const header = 'date,taskId,hours';
    const csvLines = entries.map(entry => `${entry.date},${entry.taskId},${entry.hours}`);
    const csvContent = [header, ...csvLines].join('\n');
    await writeFile(filePath, csvContent, 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing log file ${filePath}:`, error);
    return false;
  }
}

/**
 * Get repository state from state file
 * @param filePath Path to the state file
 * @returns Repository state
 */
export async function getRepoState(filePath: string = REPO_STATE_FILE_PATH): Promise<RepoState> {
  try {
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data) as RepoState;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {}; // File not found, return empty state
    }
    console.error(`Error reading repo state file ${filePath}:`, error);
    return {};
  }
}

/**
 * Write repository state to a file
 * @param state Repository state to write
 * @param filePath Path to the state file
 * @returns True if successful, false otherwise
 */
export async function writeRepoState(state: RepoState, filePath: string = REPO_STATE_FILE_PATH): Promise<boolean> {
  try {
    await writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing repo state file ${filePath}:`, error);
    return false;
  }
}
