import { useState, useMemo } from 'react';
import { getStartOfWeek, getEntriesInRange, splitEntriesByWeek } from '../utils/dateUtils';
import type { LogEntry } from '@/types';

export const useDateRange = (entries: LogEntry[]) => {
  const [from, setFrom] = useState<string>(() => {
    // Default to last 5 weeks, starting from Monday
    const fiveWeeksAgo = new Date();
    fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35);
    const startOfWeek = getStartOfWeek(fiveWeeksAgo);
    return startOfWeek.toISOString().slice(0, 10);
  });

  const [to, setTo] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  // Memoized filtered data
  const filtered = useMemo(() => {
    return getEntriesInRange(entries, new Date(from), new Date(to));
  }, [entries, from, to]);

  // Memoized weeks data
  const weeks = useMemo(() => {
    return splitEntriesByWeek(filtered, new Date(from), new Date(to));
  }, [filtered, from, to]);

  // Handler for date range changes with week snapping
  const handleDateRangeChange = (newFrom: string, newTo: string) => {
    // Auto-snap 'from' date to start of week (Monday)
    const fromDate = getStartOfWeek(new Date(newFrom));
    const snappedFrom = fromDate.toISOString().slice(0, 10);
    setFrom(snappedFrom);
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