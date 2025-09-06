import { useCallback } from 'react';
import { logWorkToJira } from '../services/JiraIntegration';
import { getErrorMessage } from '../utils/errorUtils';
import type { LogEntry } from '@/types';

export const useJiraWorklog = () => {
  const sendWorklog = useCallback(async (entry: LogEntry): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      // Format date for Jira: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
      const started = `${entry.date}T09:00:00.000+0000`;
      await logWorkToJira(entry.taskId, entry.hours * 60 * 60, started);
      
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }, []);

  return {
    sendWorklog
  };
};