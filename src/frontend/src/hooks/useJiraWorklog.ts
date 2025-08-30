import { useCallback } from 'react';
import { logWorkToJira } from '../services/JiraIntegration';
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
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Failed to send worklog to Jira: ${message}` };
    }
  }, []);

  return {
    sendWorklog
  };
};