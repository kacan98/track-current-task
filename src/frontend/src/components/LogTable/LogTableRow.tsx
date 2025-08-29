// components/LogTable/LogTableRow.tsx - Updated to support day grouping
import { Button } from '../Button';
import { HourAdjustButtons } from '../HourAdjustButtons';
import { getJiraTaskUrl } from '../jira-utils';
import type { LogEntry } from '../types';
import { JiraHeadingCell, type JiraHeadingCellProps } from './JiraHeadingCell';
import { JiraWorklogCell, type JiraWorklogCellProps } from './JiraWorklogCell';
import { useLogEntries } from '../../contexts/LogEntriesContext';

export type LogTableRowProps = {
  entry: LogEntry;
  taskColorMap: Record<string, string>;
  loadingHeadings: JiraHeadingCellProps['loadingHeadings'];
  headingsError: JiraHeadingCellProps['headingsError'];
  issueHeadings: JiraHeadingCellProps['issueHeadings'];
  loadingWorklogs: JiraWorklogCellProps['loadingWorklogs'];
  worklogError: JiraWorklogCellProps['worklogError'];
  worklogTotals: JiraWorklogCellProps['worklogTotals'];
  handleDeleteEntry: (id: string) => void;
  handleSendToJira?: (entry: LogEntry) => void;
  handleCloneEntry: (id: string) => void;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
};

export function LogTableRow({
  entry,
  taskColorMap: dfoTaskColorMap,
  loadingHeadings,
  headingsError,
  issueHeadings,
  loadingWorklogs,
  worklogError,
  worklogTotals,
  handleDeleteEntry,
  handleSendToJira,
  handleCloneEntry,
  isFirstInGroup = false,
  isLastInGroup = false,
}: LogTableRowProps) {
  const { updateEntryHours } = useLogEntries();
  const url = getJiraTaskUrl(entry.taskId);
  const taskCellClass = /^DFO-\d+$/.test(entry.taskId)
    ? dfoTaskColorMap[entry.taskId] + ' font-mono rounded px-2 py-1'
    : 'text-gray-500';

  // Add subtle grouping styling
  const rowClass = `
    border-t border-gray-200 hover:bg-gray-50 transition-colors
    ${isFirstInGroup ? 'border-l-4 border-l-blue-300' : 'border-l-4 border-l-gray-100'}
    ${isLastInGroup ? 'border-b-2 border-b-gray-300' : ''}
  `;

  return (
    <tr className={rowClass}>
      <td className={`px-3 py-2 whitespace-nowrap text-center ${taskCellClass}`}>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
            {entry.taskId}
          </a>
        ) : (
          entry.taskId
        )}
      </td>
      <td className="px-3 py-2 text-center">
        <JiraHeadingCell
          entry={entry}
          loadingHeadings={loadingHeadings}
          headingsError={headingsError}
          issueHeadings={issueHeadings}
        />
      </td>
      <td className="px-3 py-2 text-center">
        <HourAdjustButtons
          value={entry.hours}
          onChange={v => updateEntryHours(entry.id, +v)}
          disabled={entry.sentToJira}
        />
        <JiraWorklogCell
          keyId={entry.id}
          loadingWorklogs={loadingWorklogs}
          worklogError={worklogError}
          worklogTotals={worklogTotals}
        />
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex justify-center items-center gap-2">
          {handleSendToJira && (
            <Button
              variant={entry.sentToJira ? "secondary" : "primary"}
              className="flex items-center gap-2"
              disabled={entry.sentToJira}
              onClick={() => handleSendToJira(entry)}
              aria-label={entry.sentToJira ? 'Already sent to Jira' : 'Send to Jira'}
            >
              <span className="material-symbols-outlined text-sm">
                {entry.sentToJira ? 'check_circle' : 'send'}
              </span>
              <span>{entry.sentToJira ? 'Sent' : 'Send'}</span>
            </Button>
          )}
          <Button
            variant="secondary"
            className="flex items-center gap-2"
            onClick={() => handleCloneEntry(entry.id)}
            aria-label="Clone entry"
          >
            <span className="material-symbols-outlined text-sm">content_copy</span>
            <span>Clone</span>
          </Button>
          <Button
            variant="secondary"
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleDeleteEntry(entry.id)}
            aria-label="Delete entry"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            <span>Delete</span>
          </Button>
        </div>
      </td>
    </tr>
  );
}