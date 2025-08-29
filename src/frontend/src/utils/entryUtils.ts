import type { LogEntry } from '../components/types';

export function generateId(): string {
  return crypto.randomUUID();
}

export function createEntry(
  taskId: string,
  date: string,
  hours: number,
  options: {
    eventName?: string;
    eventId?: string;
    sentToJira?: boolean;
  } = {}
): LogEntry {
  return {
    id: generateId(),
    taskId,
    date,
    hours,
    sentToJira: options.sentToJira ?? false,
    eventName: options.eventName,
    eventId: options.eventId,
  };
}

export function cloneEntry(entry: LogEntry): LogEntry {
  return {
    ...entry,
    id: generateId(),
    sentToJira: false,
  };
}