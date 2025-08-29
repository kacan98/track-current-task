import { useMemo } from 'react';
import type { LogEntry } from '../components/types';
import { useLogEntries } from '../contexts/LogEntriesContext';

export function useDayGrouping(entries: LogEntry[]) {
  const { getEffectiveHours } = useLogEntries();
  
  return useMemo(() => {
    const dayGroups: { [date: string]: { entries: (LogEntry & { keyId: string })[], totalHours: number } } = {};
    
    entries.forEach((entry, idx) => {
      const keyId = `${entry.taskId}|${entry.date}${entry.eventId ? `|${entry.eventId}` : entry.eventName ? `|${entry.eventName}` : `|${idx}`}`;
      const entryWithKey = { ...entry, keyId };
      
      if (!dayGroups[entry.date]) {
        dayGroups[entry.date] = { entries: [], totalHours: 0 };
      }
      
      dayGroups[entry.date].entries.push(entryWithKey);
      
      // Use effective hours from context
      const hours = getEffectiveHours(entry.taskId, entry.date, entry.hours);
      dayGroups[entry.date].totalHours += hours || 0;
    });
    
    return dayGroups;
  }, [entries, getEffectiveHours]);
}