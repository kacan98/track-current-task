// Shared type definitions used across frontend and backend

// API Error Response structure - consistent across all backend endpoints
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
    path: string;
    method: string;
  };
}

// Base log entry as stored in CSV
export interface BaseLogEntry {
  date: string;        // YYYY-MM-DD
  taskId: string;
  repository: string;  // Full path to repository
  hours: number;
}

// Enhanced log entry used in frontend with additional UI fields
export interface LogEntry extends BaseLogEntry {
  id: string;              // Unique GUID generated on frontend
  sentToJira: boolean;     // UI state for Jira sync
  eventName?: string;      // For recurring events
  eventId?: string;        // For recurring events
}

// CSV column definitions - ensures type safety when writing/reading CSV
export const CSV_COLUMNS = ['date', 'taskId', 'repository', 'hours'] as const;
export type CSVColumn = typeof CSV_COLUMNS[number];

// Type-safe CSV record
export type CSVRecord = Record<CSVColumn, string>;

// Helper to ensure CSV header matches our column definitions
export const CSV_HEADER = CSV_COLUMNS.join(',');

// Type guard to validate base log entry has all required fields
export function isValidBaseLogEntry(obj: unknown): obj is BaseLogEntry {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }
  
  const record = obj as Record<string, unknown>;
  return (
    typeof record.date === 'string' &&
    typeof record.taskId === 'string' &&
    typeof record.repository === 'string' &&
    typeof record.hours === 'number' &&
    !isNaN(record.hours)
  );
}

// Convert BaseLogEntry to CSV record
export function baseLogEntryToCSVRecord(entry: BaseLogEntry): CSVRecord {
  return {
    date: entry.date,
    taskId: entry.taskId,
    repository: entry.repository,
    hours: entry.hours.toString()
  };
}

// Convert CSV record to BaseLogEntry
export function csvRecordToBaseLogEntry(record: CSVRecord): BaseLogEntry {
  return {
    date: record.date,
    taskId: record.taskId,
    repository: record.repository,
    hours: parseFloat(record.hours)
  };
}