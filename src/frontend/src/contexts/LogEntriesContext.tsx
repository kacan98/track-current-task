import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { LogEntry } from '../components/types';

interface LogEntriesContextType {
  // All log entries (both from CSV and added events)
  entries: LogEntry[];
  
  // Actions
  setEntries: (entries: LogEntry[]) => void;
  addEntry: (entry: LogEntry) => void;
  addEntries: (entries: LogEntry[]) => void;
  updateEntryHours: (taskId: string, date: string, hours: number) => void;
  markAsSentToJira: (taskId: string, date: string, hours: number) => void;
  clearAllData: () => void;
  
  // Computed values
  getSentStatus: (taskId: string, date: string, hours: number) => boolean;
  getEffectiveHours: (taskId: string, date: string, originalHours: number) => number;
}

const LogEntriesContext = createContext<LogEntriesContextType | undefined>(undefined);

export function LogEntriesProvider({ children }: { children: ReactNode }) {
  const [entries, setEntriesState] = useState<LogEntry[]>(() => {
    const stored = localStorage.getItem('allLogEntries');
    return stored ? JSON.parse(stored) : [];
  });
  
  const [editedHours, setEditedHours] = useState<Record<string, number>>(() => {
    const stored = localStorage.getItem('editedHours');
    return stored ? JSON.parse(stored) : {};
  });
  
  const [sentToJira, setSentToJira] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('sentToJira');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem('allLogEntries', JSON.stringify(entries));
    }
  }, [entries]);
  
  useEffect(() => {
    localStorage.setItem('editedHours', JSON.stringify(editedHours));
  }, [editedHours]);
  
  useEffect(() => {
    localStorage.setItem('sentToJira', JSON.stringify(Array.from(sentToJira)));
  }, [sentToJira]);

  const setEntries = (newEntries: LogEntry[]) => {
    setEntriesState(newEntries);
  };

  const addEntry = (entry: LogEntry) => {
    setEntriesState(prev => {
      // Check if this entry already exists (same date, taskId, and eventId if present)
      const exists = prev.some(e => 
        e.date === entry.date && 
        e.taskId === entry.taskId &&
        (entry.eventId ? e.eventId === entry.eventId : true)
      );
      if (exists) return prev;
      return [...prev, entry];
    });
  };
  
  const addEntries = (newEntries: LogEntry[]) => {
    setEntriesState(prev => {
      const combined = [...prev];
      for (const entry of newEntries) {
        const exists = combined.some(e => 
          e.date === entry.date && 
          e.taskId === entry.taskId &&
          (entry.eventId ? e.eventId === entry.eventId : true)
        );
        if (!exists) {
          combined.push(entry);
        }
      }
      return combined;
    });
  };

  const updateEntryHours = (taskId: string, date: string, hours: number) => {
    const key = `${taskId}|${date}`;
    setEditedHours(prev => ({
      ...prev,
      [key]: hours
    }));
  };

  const markAsSentToJira = (taskId: string, date: string, hours: number) => {
    const key = `${taskId}|${date}|${hours}`;
    setSentToJira(prev => new Set(prev).add(key));
  };
  
  const clearAllData = () => {
    setEntriesState([]);
    setEditedHours({});
    setSentToJira(new Set());
    localStorage.removeItem('allLogEntries');
    localStorage.removeItem('editedHours');
    localStorage.removeItem('sentToJira');
    localStorage.removeItem('extraRows'); // Clean up old storage
    localStorage.removeItem('activityLogEntries'); // Clean up old storage
  };

  const getSentStatus = (taskId: string, date: string, hours: number) => {
    const key = `${taskId}|${date}|${hours}`;
    return sentToJira.has(key);
  };
  
  const getEffectiveHours = (taskId: string, date: string, originalHours: number) => {
    const key = `${taskId}|${date}`;
    return editedHours[key] !== undefined ? editedHours[key] : originalHours;
  };

  const value: LogEntriesContextType = {
    entries,
    setEntries,
    addEntry,
    addEntries,
    updateEntryHours,
    markAsSentToJira,
    clearAllData,
    getSentStatus,
    getEffectiveHours,
  };

  return (
    <LogEntriesContext.Provider value={value}>
      {children}
    </LogEntriesContext.Provider>
  );
}

export function useLogEntries() {
  const context = useContext(LogEntriesContext);
  if (context === undefined) {
    throw new Error('useLogEntries must be used within a LogEntriesProvider');
  }
  return context;
}