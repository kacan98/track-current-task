import type { LogEntry } from '@/types';
import { isValidTaskId } from '@/utils/jiraUtils';
import { useSettings } from '@/contexts/SettingsContext';

export type JiraHeadingCellProps = {
  entry: LogEntry;
  loadingHeadings: Record<string, boolean>;
  headingsError: Record<string, string>;
  issueHeadings: Record<string, string>;
};

export function JiraHeadingCell({ entry, loadingHeadings, headingsError, issueHeadings }: JiraHeadingCellProps) {
  const settings = useSettings();
  const taskIdRegex = settings?.getSetting('taskIdRegex');
  
  if (isValidTaskId(entry.taskId, taskIdRegex)) {
    if (loadingHeadings[entry.taskId]) {
      return <span className="italic text-blue-400">Loading...</span>;
    } else if (headingsError[entry.taskId]) {
      return <span className="text-red-500">{headingsError[entry.taskId]}</span>;
    } else {
      return issueHeadings[entry.taskId] || <span className="text-gray-400">Not found</span>;
    }
  }
  return <span className="text-gray-300">—</span>;
}
