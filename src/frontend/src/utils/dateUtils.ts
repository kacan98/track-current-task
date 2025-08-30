import type { LogEntry } from "@/types";

export function startOfWeek(date: Date, opts?: { weekStartsOn?: number }) {
  const d = new Date(date);
  const weekStartsOn = opts?.weekStartsOn ?? 0;
  const day = d.getDay();
  const diff = (day + 7 - weekStartsOn) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(date: Date, opts?: { weekStartsOn?: number }) {
  const d = startOfWeek(date, opts);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function format(date: Date, fmt: string) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (fmt === 'yyyy-MM-dd') {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  if (fmt === 'EEEE') {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return date.toISOString();
}

export function getEntriesInRange(entries: LogEntry[], from: Date, to: Date): LogEntry[] {
  return entries.filter(e => {
    const d = new Date(e.date);
    return d >= from && d <= to;
  });
}

export function splitEntriesByWeek(entries: LogEntry[], from: Date, to: Date) {
  const weeks: Array<{ start: Date; end: Date; entries: LogEntry[] }> = [];
  let current = startOfWeek(from, { weekStartsOn: 1 }); // Monday
  const last = endOfWeek(to, { weekStartsOn: 1 });
  while (current <= last) {
    const weekStart = new Date(current);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekEntries = entries.filter(e => {
      const d = new Date(e.date);
      return d >= weekStart && d <= weekEnd;
    });
    weeks.push({ start: weekStart, end: weekEnd, entries: weekEntries });
    // Advance to next Monday
    current = new Date(weekStart);
    current.setDate(current.getDate() + 7);
    current.setHours(0, 0, 0, 0);
  }
  return weeks;
}

export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Calculate days from Monday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}