import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { LogEntry } from '../components/types';
import { generateId, createEntry, cloneEntry } from '../utils/entryUtils';

interface LogEntriesContextType {
  // All log entries
  entries: LogEntry[];
  
  // Actions
  setEntries: (entries: LogEntry[]) => void;
  addEntry: (entry: LogEntry) => void;
  addEntries: (entries: LogEntry[]) => void;
  updateEntryHours: (id: string, hours: number) => void;
  updateEntryDate: (id: string, newDate: string) => void;
  updateEntryTaskId: (id: string, newTaskId: string) => void;
  markAsSentToJira: (id: string) => void;
  deleteEntry: (id: string) => void;
  cloneEntry: (id: string) => void;
  clearAllData: () => void;
}

const LogEntriesContext = createContext<LogEntriesContextType | undefined>(undefined);

function migrateOldEntry(oldEntry: any): LogEntry {
  // Handle old entries without IDs
  return {
    id: oldEntry.id || generateId(),
    date: oldEntry.date,
    taskId: oldEntry.taskId,
    hours: oldEntry.hours,
    sentToJira: oldEntry.sentToJira || false,
    eventName: oldEntry.eventName,
    eventId: oldEntry.eventId,
  };
}

export function LogEntriesProvider({ children }: { children: ReactNode }) {
  const [entries, setEntriesState] = useState<LogEntry[]>(() => {
    const stored = localStorage.getItem('allLogEntries');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map(migrateOldEntry);
    }
    return [];
  });

  // Save to localStorage whenever entries change
  useEffect(() => {
    localStorage.setItem('allLogEntries', JSON.stringify(entries));
  }, [entries]);

  const setEntries = (newEntries: LogEntry[]) => {
    // Migrate entries that might not have IDs
    const migratedEntries = newEntries.map(entry => 
      entry.id ? entry : migrateOldEntry(entry)
    );
    setEntriesState(migratedEntries);
  };

  const addEntry = (entry: LogEntry) => {
    setEntriesState(prev => [...prev, entry]);
  };
  
  const addEntries = (newEntries: LogEntry[]) => {
    const migratedEntries = newEntries.map(entry => 
      entry.id ? entry : migrateOldEntry(entry)
    );
    setEntriesState(prev => [...prev, ...migratedEntries]);
  };

  const updateEntryHours = (id: string, hours: number) => {
    setEntriesState(prev => 
      prev.map(entry => 
        entry.id === id ? { ...entry, hours } : entry
      )
    );
  };

  const updateEntryDate = (id: string, newDate: string) => {
    setEntriesState(prev => 
      prev.map(entry => 
        entry.id === id ? { ...entry, date: newDate } : entry
      )
    );
  };

  const updateEntryTaskId = (id: string, newTaskId: string) => {
    setEntriesState(prev => 
      prev.map(entry => 
        entry.id === id ? { ...entry, taskId: newTaskId } : entry
      )
    );
  };

  const markAsSentToJira = (id: string) => {
    setEntriesState(prev => 
      prev.map(entry => 
        entry.id === id ? { ...entry, sentToJira: true } : entry
      )
    );
  };
  
  const deleteEntry = (id: string) => {
    setEntriesState(prev => prev.filter(entry => entry.id !== id));
  };

  const cloneEntryById = (id: string) => {
    setEntriesState(prev => {
      const entry = prev.find(e => e.id === id);
      if (!entry) return prev;
      const cloned = cloneEntry(entry);
      return [...prev, cloned];
    });
  };

  const clearAllData = () => {
    setEntriesState([]);
    localStorage.removeItem('allLogEntries');
    localStorage.removeItem('editedHours'); // Clean up old storage
    localStorage.removeItem('sentToJira'); // Clean up old storage
    localStorage.removeItem('extraRows'); // Clean up old storage
    localStorage.removeItem('activityLogEntries'); // Clean up old storage
  };

  const value: LogEntriesContextType = {
    entries,
    setEntries,
    addEntry,
    addEntries,
    updateEntryHours,
    updateEntryDate,
    updateEntryTaskId,
    markAsSentToJira,
    deleteEntry,
    cloneEntry: cloneEntryById,
    clearAllData,
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