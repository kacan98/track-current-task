import { useState, useEffect } from 'react';
import type { LogEntry } from '../components/types';
import { getSetting } from '../components/SettingsPage';
import type { RecurringEvent } from '../components/RecurringEventsEditor';

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
  const [extraRows, setExtraRows] = useState<LogEntry[]>([]);
  const [eventStates, setEventStates] = useState<Record<string, boolean>>({});

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('extraRows');
    if (saved) {
      try {
        setExtraRows(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Save to localStorage whenever extraRows changes
  useEffect(() => {
    localStorage.setItem('extraRows', JSON.stringify(extraRows));
  }, [extraRows]);

  const handleAddDailyScrum = () => {
    if (!weekStart || !weekEnd) return;
    const taskId = getSetting('scrumTaskId');
    const minutes = parseFloat(getSetting('scrumDailyDurationMinutes'));
    const hours = minutes / 60;
    const weekDates = getWeekDates(weekStart, weekEnd);
    const newRows: LogEntry[] = weekDates.map(date => ({
      date,
      taskId,
      hours,
      sentToJira: false,
      eventName: 'Daily Scrum',
      eventId: 'dailyScrum',
    }));
    setExtraRows(prev => {
      const allRows = [...prev, ...newRows];
      const uniqueRows = allRows.filter((row, idx, arr) => 
        arr.findIndex(r => r.date === row.date && r.eventId === row.eventId) === idx
      );
      return uniqueRows;
    });
    setEventStates(prev => ({ ...prev, dailyScrum: true }));
  };

  const handleAddEvent = (ev: RecurringEvent) => {
    if (!weekStart || !weekEnd) return;
    const taskId = getSetting('scrumTaskId');
    const minutes = parseFloat(ev.durationMinutes);
    const hours = minutes / 60;
    const dates = getDatesForDayInWeek(weekStart, weekEnd, ev.day);
    if (!dates.length) return;
    const newRows: LogEntry[] = dates.map(date => ({
      date,
      taskId,
      hours,
      sentToJira: false,
      eventName: ev.name,
      eventId: ev.id,
    }));
    setExtraRows(prev => {
      const allRows = [...prev, ...newRows];
      const uniqueRows = allRows.filter((row, idx, arr) => 
        arr.findIndex(r => r.date === row.date && r.eventId === row.eventId) === idx
      );
      return uniqueRows;
    });
    setEventStates(prev => ({ ...prev, [ev.id]: true }));
  };

  const handleCloneExtraRow = (entry: LogEntry) => {
    // Generate a new eventId for uniqueness
    const newEventId = `clone-${entry.taskId}-${entry.date}-${entry.hours}-${Math.random().toString(36).slice(2, 8)}`;
    const clonedEntry: LogEntry = {
      ...entry,
      eventId: newEventId,
    };
    setExtraRows(prev => [...prev, clonedEntry]);
  };

  return {
    extraRows,
    eventStates,
    handleAddDailyScrum,
    handleAddEvent,
    handleCloneExtraRow,
  };
}
