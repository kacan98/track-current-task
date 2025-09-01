import { useState, useCallback } from 'react';
import { loadFromBackend as loadCSVFromBackend, processCSVFile } from '../services/csvProcessor';
import type { LogEntry } from '@/types';

interface DataResult {
  success: boolean;
  data?: LogEntry[];
  error?: string;
}

export const useDataLoader = () => {
  const [isLoading, setIsLoading] = useState(false);

  const loadFromBackend = useCallback(async (): Promise<DataResult> => {
    setIsLoading(true);
    
    try {
      const result = await loadCSVFromBackend();
      
      if (result.error) {
        return { success: false, error: result.error };
      } else if (result.data) {
        return { success: true, data: result.data };
      }
      
      return { success: false, error: 'No data received from backend' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load from backend';
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const processFile = useCallback(async (file: File): Promise<DataResult> => {
    setIsLoading(true);
    
    try {
      const result = await processCSVFile(file);
      
      if (result.error) {
        return { success: false, error: result.error };
      } else if (result.data) {
        return { success: true, data: result.data };
      }
      
      return { success: false, error: 'No data processed from file' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to process file';
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    loadFromBackend,
    processFile
  };
};