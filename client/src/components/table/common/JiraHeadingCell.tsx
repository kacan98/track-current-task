import type { LogEntry } from '@/types';
import { isValidTaskId } from '@/utils/jiraUtils';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/Button';

export type JiraHeadingCellProps = {
  entry: LogEntry;
  loadingHeadings: Record<string, boolean>;
  headingsError: Record<string, string>;
  issueHeadings: Record<string, string>;
};

export function JiraHeadingCell({ entry, loadingHeadings, headingsError, issueHeadings }: JiraHeadingCellProps) {
  const settings = useSettings();
  const taskIdRegex = settings?.getSetting('taskIdRegex');
  const jiraBaseUrl = settings?.getSetting('jiraBaseUrl');
  
  const handleJiraNavigation = () => {
    if (jiraBaseUrl && entry.taskId) {
      const url = `${jiraBaseUrl}/browse/${entry.taskId}`;
      window.open(url, '_blank');
    }
  };
  
  if (isValidTaskId(entry.taskId, taskIdRegex)) {
    if (loadingHeadings[entry.taskId]) {
      return <span className="italic text-blue-400">Loading...</span>;
    } else if (headingsError[entry.taskId]) {
      return <span className="text-red-500">{headingsError[entry.taskId]}</span>;
    } else {
      const heading = issueHeadings[entry.taskId];
      if (heading && jiraBaseUrl) {
        return (
          <Button
            onClick={handleJiraNavigation}
            size="sm"
            variant="secondary"
            className="text-left hover:text-blue-600 hover:underline !p-0 !border-0 !shadow-none !bg-transparent hover:!bg-transparent"
            title={`Open ${entry.taskId} in Jira`}
          >
            {heading}
          </Button>
        );
      }
      return heading || <span className="text-gray-400">Not found</span>;
    }
  }
  return <span className="text-gray-300">—</span>;
}
