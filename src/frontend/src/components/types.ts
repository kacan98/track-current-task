export interface LogEntry {
  date: string;
  taskId: string;
  hours: number;
  sentToJira: boolean;
  eventName?: string;
  eventId?: string;
}
