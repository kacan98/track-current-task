// components/LogTable/LogTableRow.tsx - Updated to support day grouping
import type { LogEntry } from '../types';
import { getDayOfWeek } from '../utils';
import { getJiraTaskUrl } from '../jira-utils';
import { Button } from '../Button';
import { HourAdjustButtons } from '../HourAdjustButtons';
import { JiraHeadingCell, type JiraHeadingCellProps } from './JiraHeadingCell';
import { JiraWorklogCell, type JiraWorklogCellProps } from './JiraWorklogCell';
import type { EditedHours } from '../LogTable';

export type LogTableRowProps = {
  entry: LogEntry;
  keyId: string;
  taskColorMap: Record<string, string>;
  editedHours: EditedHours;
  setEditedHours: (v: EditedHours) => void;
  loadingHeadings: JiraHeadingCellProps['loadingHeadings'];
  headingsError: JiraHeadingCellProps['headingsError'];
  issueHeadings: JiraHeadingCellProps['issueHeadings'];
  loadingWorklogs: JiraWorklogCellProps['loadingWorklogs'];
  worklogError: JiraWorklogCellProps['worklogError'];
  worklogTotals: JiraWorklogCellProps['worklogTotals'];
  handleSendToJira: (entry: LogEntry) => void;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showDateColumn?: boolean; // New prop to conditionally show date
};

export function LogTableRow({
  entry,
  keyId,
  taskColorMap: dfoTaskColorMap,
  editedHours,
  setEditedHours,
  loadingHeadings,
  headingsError,
  issueHeadings,
  loadingWorklogs,
  worklogError,
  worklogTotals,
  handleSendToJira,
  isFirstInGroup = false,
  isLastInGroup = false,
  showDateColumn = true
}: LogTableRowProps) {
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
      {showDateColumn && (
        <>
          <td className="px-3 py-2 whitespace-nowrap text-center text-gray-900">{entry.date}</td>
          <td className="px-3 py-2 whitespace-nowrap text-center text-gray-900">{getDayOfWeek(entry.date)}</td>
        </>
      )}
      {!showDateColumn && (
        <>
          <td className="px-3 py-2 whitespace-nowrap text-center text-gray-400">—</td>
          <td className="px-3 py-2 whitespace-nowrap text-center text-gray-400">—</td>
        </>
      )}
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
          value={editedHours[keyId] !== undefined ? editedHours[keyId] : entry.hours}
          onChange={v => setEditedHours({ ...editedHours, [keyId]: +v })}
          disabled={entry.sentToJira}
        />
        <JiraWorklogCell
          keyId={keyId}
          loadingWorklogs={loadingWorklogs}
          worklogError={worklogError}
          worklogTotals={worklogTotals}
        />
      </td>
      <td className="px-3 py-2 text-center">
        {entry.sentToJira ? (
          <span className="text-green-600 text-lg">
            <span className="material-symbols-outlined">check_circle</span>
          </span>
        ) : (
          <span className="text-red-500 text-lg">
            <span className="material-symbols-outlined">cancel</span>
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex justify-center items-center">
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
        </div>
      </td>
    </tr>
  );
}