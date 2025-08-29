export interface LogEntry {
  id: string;              // Unique GUID
  date: string;
  taskId: string;
  hours: number;
  sentToJira: boolean;     // Direct property
  eventName?: string;      // For recurring events
  eventId?: string;        // For recurring events
}
