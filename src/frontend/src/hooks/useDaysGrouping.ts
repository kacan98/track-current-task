import { useMemo } from 'react';
import type { LogEntry } from '../components/types';
import type { EditedHours } from '../components/LogTable';

export function useDayGrouping(entries: LogEntry[], editedHours: EditedHours) {
  return useMemo(() => {
    const dayGroups: { [date: string]: { entries: (LogEntry & { keyId: string })[], totalHours: number } } = {};
    
    entries.forEach((entry, idx) => {
      const keyId = `${entry.taskId}|${entry.date}${entry.eventId ? `|${entry.eventId}` : entry.eventName ? `|${entry.eventName}` : `|${idx}`}`;
      const entryWithKey = { ...entry, keyId };
      
      if (!dayGroups[entry.date]) {
        dayGroups[entry.date] = { entries: [], totalHours: 0 };
      }
      
      dayGroups[entry.date].entries.push(entryWithKey);
      
      // Use edited hours if available, otherwise use original hours
      const hours = editedHours[keyId] !== undefined ? editedHours[keyId] : entry.hours;
      dayGroups[entry.date].totalHours += hours || 0;
    });
    
    return dayGroups;
  }, [entries, editedHours]);
}