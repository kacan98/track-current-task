import { useMemo } from 'react';
import type { LogEntry } from '../components/types';

export function useDayGrouping(entries: LogEntry[]) {
  return useMemo(() => {
    const dayGroups: { [date: string]: { entries: LogEntry[], totalHours: number } } = {};
    
    entries.forEach((entry) => {
      if (!dayGroups[entry.date]) {
        dayGroups[entry.date] = { entries: [], totalHours: 0 };
      }
      
      dayGroups[entry.date].entries.push(entry);
      dayGroups[entry.date].totalHours += entry.hours || 0;
    });
    
    return dayGroups;
  }, [entries]);
}