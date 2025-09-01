import { readFile, writeFile } from 'fs/promises';
import { ACTIVITY_LOG_FILE_PATH, REPO_STATE_FILE_PATH } from '..';
import { RepoState } from './repo-state-types';
import { logger } from '../../../../shared/logger';

export interface LogEntry {
  date: string; // YYYY-MM-DD
  taskId: string;
  repository: string; // Full path to repository
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
export async function getLogEntries(): Promise<LogEntry[]> {
  try {
    const data = await readFile(ACTIVITY_LOG_FILE_PATH, 'utf-8');
    const lines = data.trim().split('\n');
    if (lines.length <= 1) {
      return []; // Empty or only header
    }
    // Check header format
    const header = lines[0].split(',').map(h => h.trim());
    const expectedHeader = ['date', 'taskId', 'repository', 'hours'];
    const missingColumns = expectedHeader.filter(col => !header.includes(col));
    
    if (missingColumns.length > 0) {
      throw new Error(`Invalid CSV header. Missing columns: ${missingColumns.join(', ')}. Found: ${header.join(', ')}`);
    }
    
    // Skip header row, parse the rest
    return lines.slice(1).map((line, index) => {
      const parts = line.split(',');
      if (parts.length !== 4) {
        throw new Error(`Invalid CSV format on line ${index + 2}: "${line}". Expected 4 columns (date,taskId,repository,hours) but found ${parts.length}`);
      }
      const [date, taskId, repository, hoursStr] = parts;
      return { date, taskId, repository, hours: parseFloat(hoursStr) };
    });
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return []; // File not found, return empty array
    }
    logger.error(`Error reading log file ${ACTIVITY_LOG_FILE_PATH}:`, String(error));
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
    const header = 'date,taskId,repository,hours';
    const csvLines = entries.map(entry => `${entry.date},${entry.taskId},${entry.repository},${entry.hours}`);
    const csvContent = [header, ...csvLines].join('\n');
    await writeFile(filePath, csvContent, 'utf-8');
    return true;
  } catch (error) {
    logger.error(`Error writing log file ${filePath}:`, String(error));
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
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return {}; // File not found, return empty state
    }
    logger.error(`Error reading repo state file ${filePath}:`, String(error));
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
    logger.error(`Error writing repo state file ${filePath}:`, String(error));
    return false;
  }
}
