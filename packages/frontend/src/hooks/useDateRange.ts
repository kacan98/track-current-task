import { useState, useMemo, useEffect } from 'react';
import { getEntriesInRange, splitEntriesByWeek } from '../utils/dateUtils';
import { useSettings } from '../contexts/SettingsContext';
import { getDateRangeForPreset, DEFAULT_PRESET } from '../utils/dateRangeUtils';
import type { LogEntry } from '@/types';

export const useDateRange = (entries: LogEntry[]) => {
  const { getSetting } = useSettings();
  const weekStartDay = parseInt(getSetting('weekStartDay') || '1'); // Default to Monday (1)

  // Initialize with empty state, will be set by useEffect
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  
  // Initialize and update when weekStartDay changes
  useEffect(() => {
    // Use the default preset from the shared utility
    const range = getDateRangeForPreset(DEFAULT_PRESET, weekStartDay);
    setFrom(range.from);
    setTo(range.to);
  }, [weekStartDay]); // Recalculate when weekStartDay changes

  // Helper to create local date from YYYY-MM-DD string
  const parseLocalDate = (dateStr: string, endOfDay = false) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  };

  // Memoized filtered data
  const filtered = useMemo(() => {
    return getEntriesInRange(entries, parseLocalDate(from), parseLocalDate(to, true));
  }, [entries, from, to]);

  // Memoized weeks data
  const weeks = useMemo(() => {
    return splitEntriesByWeek(filtered, parseLocalDate(from), parseLocalDate(to, true), weekStartDay);
  }, [filtered, from, to, weekStartDay]);

  // Handler for date range changes
  const handleDateRangeChange = (newFrom: string, newTo: string) => {
    setFrom(newFrom);
    setTo(newTo);
  };

  return {
    from,
    to,
    filtered,
    weeks,
    setFrom,
    setTo,
    handleDateRangeChange
  };
};