import type { LogEntry } from "@/types";

// REMOVED: startOfWeek and endOfWeek - these were broken and causing timezone issues
// DateRangePicker handles all Monday calculations correctly

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

export function splitEntriesByWeek(entries: LogEntry[], from: Date, to: Date, _weekStartDay = 1) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const weeks: Array<{ start: Date; end: Date; entries: LogEntry[] }> = [];
  
  // Start from the 'from' date directly - DateRangePicker already calculated the correct week start
  const current = new Date(from);
  current.setHours(0, 0, 0, 0);
  
  while (current <= to) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6); // 7 days total
    weekEnd.setHours(23, 59, 59, 999);
    
    // Get all entries for this exact week
    const weekEntries = entries.filter(e => {
      const entryDate = new Date(e.date + 'T00:00:00'); // Fix timezone parsing
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
    
    weeks.push({ start: weekStart, end: weekEnd, entries: weekEntries });
    
    // Move to next week start (exactly 7 days)
    current.setDate(current.getDate() + 7);
  }
  
  // Sort weeks by start date (most recent first)
  return weeks.sort((a, b) => b.start.getTime() - a.start.getTime());
}