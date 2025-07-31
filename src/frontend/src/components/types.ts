export interface LogEntry {
  date: string;
  taskId: string;
  hours: number;
  eventName?: string;
  eventId?: string;
  isClone?: boolean;
}
