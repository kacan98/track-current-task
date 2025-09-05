import { useSettings } from '@/contexts/SettingsContext';
import type { RecurringEvent } from '@/components/RecurringEventsEditor';
import { useLogEntries } from '@/contexts/LogEntriesContext';
import type { LogEntry } from '@/types';
import { cloneEntry, createEntry } from '@/utils/entryUtils';
import { useState } from 'react';

function getDatesForDayInWeek(start: string, end: string, dayName: string) {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dates: string[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    if (days[d.getDay()] === dayName) {
      dates.push(d.toISOString().slice(0, 10));
    }
  }
  return dates;
}

function getWeekDates(start: string, end: string) {
  const dates: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day >= 1 && day <= 5) {
      dates.push(d.toISOString().slice(0, 10));
    }
  }
  return dates;
}

export function useExtraRows(weekStart?: string, weekEnd?: string) {
  const { addEntries } = useLogEntries();
  const settings = useSettings();
  const [eventStates, setEventStates] = useState<Record<string, boolean>>({});

  const handleAddDailyScrum = () => {
    if (!weekStart || !weekEnd) return;
    const taskId = settings?.getSetting('scrumTaskId') || '';
    const minutes = parseFloat(settings?.getSetting('scrumDailyDurationMinutes') || '15');
    const hours = minutes / 60;
    const weekDates = getWeekDates(weekStart, weekEnd);
    const newRows: LogEntry[] = weekDates.map(date => 
      createEntry(taskId, date, hours, {
        eventName: 'Daily Scrum',
        eventId: 'dailyScrum',
      })
    );
    addEntries(newRows);
    setEventStates(prev => ({ ...prev, dailyScrum: true }));
  };

  const handleAddEvent = (ev: RecurringEvent) => {
    if (!weekStart || !weekEnd) return;
    const taskId = settings?.getSetting('scrumTaskId') || '';
    const minutes = parseFloat(ev.durationMinutes);
    const hours = minutes / 60;
    const dates = getDatesForDayInWeek(weekStart, weekEnd, ev.day);
    if (!dates.length) return;
    const newRows: LogEntry[] = dates.map(date => 
      createEntry(taskId, date, hours, {
        eventName: ev.name,
        eventId: ev.id,
      })
    );
    addEntries(newRows);
    setEventStates(prev => ({ ...prev, [ev.id]: true }));
  };

  const handleCloneExtraRow = (entry: LogEntry) => {
    const clonedEntry = cloneEntry(entry);
    addEntries([clonedEntry]);
  };

  return {
    eventStates,
    handleAddDailyScrum,
    handleAddEvent,
    handleCloneExtraRow,
  };
}
