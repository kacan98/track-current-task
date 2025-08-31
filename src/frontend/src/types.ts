export interface LogEntry {
  id: string;              // Unique GUID
  date: string;
  taskId: string;
  repository: string;      // Repository path (required)
  hours: number;
  sentToJira: boolean;     // Direct property
  eventName?: string;      // For recurring events
  eventId?: string;        // For recurring events
}
