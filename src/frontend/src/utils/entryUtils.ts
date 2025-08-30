import type { LogEntry } from "@/types";

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
  const entry: LogEntry = {
    id: generateId(),
    taskId,
    date,
    hours,
    sentToJira: options.sentToJira ?? false,
  };

  if (options.eventName !== undefined) {
    entry.eventName = options.eventName;
  }
  if (options.eventId !== undefined) {
    entry.eventId = options.eventId;
  }

  return entry;
}

export function cloneEntry(entry: LogEntry): LogEntry {
  return {
    ...entry,
    id: generateId(),
    sentToJira: false,
  };
}