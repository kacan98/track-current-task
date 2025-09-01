import type { LogEntry } from '@/types';
import { createEntry } from '../utils/entryUtils';
import { api } from './apiClient';

export interface CSVProcessResult {
  data?: LogEntry[];
  error?: string;
}

export function parseCSVText(text: string): CSVProcessResult {
  try {
    const lines = text.trim().split(/\r?\n/);
    const header = lines[0].replace(/\r/g, '').split(',').map(h => h.trim());
    const idx = {
      date: header.indexOf('date'),
      taskId: header.indexOf('taskId'),
      repository: header.indexOf('repository'),
      hours: header.indexOf('hours'),
    };

    const missingColumns = [];
    if (idx.date === -1) missingColumns.push('date');
    if (idx.taskId === -1) missingColumns.push('taskId');
    if (idx.repository === -1) missingColumns.push('repository');
    if (idx.hours === -1) missingColumns.push('hours');
    
    if (missingColumns.length > 0) {
      return { 
        error: `Invalid CSV format. Missing required columns: ${missingColumns.join(', ')}. Found columns: ${header.join(', ')}` 
      };
    }

    const data = lines.slice(1).map(line => {
      const cols = line.replace(/\r/g, '').split(',').map(c => c.trim());
      const entry = createEntry(
        cols[idx.taskId],
        cols[idx.date],
        parseFloat(cols[idx.hours])
      );
      entry.repository = cols[idx.repository];
      return entry;
    });

    return { data };
  } catch {
    return { error: 'Failed to parse CSV file. Please check the format.' };
  }
}

export function processCSVFile(file: File): Promise<CSVProcessResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(parseCSVText(text));
    };
    reader.onerror = () => {
      resolve({ error: 'Failed to read file.' });
    };
    reader.readAsText(file);
  });
}

export async function loadFromBackend(): Promise<CSVProcessResult> {
  try {
    const res = await api.files.getActivityLog();
    
    if (!res.ok) {
      throw new Error(`Activity log not found on backend (${res.status})`);
    }
    
    const text = await res.text();
    if (!text) throw new Error('Empty response from backend');
    
    return parseCSVText(text);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load from backend';
    return { error: message };
  }
}