import type { LogEntry } from '../types';
import { getDayOfWeek } from '../utils';
import { getJiraTaskUrl } from '../jira-utils';
import { Button } from '../Button';
import { HourAdjustButtons } from '../HourAdjustButtons';
import { JiraHeadingCell, type JiraHeadingCellProps } from './JiraHeadingCell';
import { JiraWorklogCell, type JiraWorklogCellProps } from './JiraWorklogCell';

export type LogTableRowProps = {
  entry: LogEntry;
  keyId: string;
  dfoTaskColorMap: Record<string, string>;
  editedHours: { [key: string]: string };
  setEditedHours: (v: { [key: string]: string }) => void;
  loadingHeadings: JiraHeadingCellProps['loadingHeadings'];
  headingsError: JiraHeadingCellProps['headingsError'];
  issueHeadings: JiraHeadingCellProps['issueHeadings'];
  loadingWorklogs: JiraWorklogCellProps['loadingWorklogs'];
  worklogError: JiraWorklogCellProps['worklogError'];
  worklogTotals: JiraWorklogCellProps['worklogTotals'];
  handleSendToJira: (entry: LogEntry) => void;
};

export function LogTableRow({
  entry,
  keyId,
  dfoTaskColorMap,
  editedHours,
  setEditedHours,
  loadingHeadings,
  headingsError,
  issueHeadings,
  loadingWorklogs,
  worklogError,
  worklogTotals,
  handleSendToJira
}: LogTableRowProps) {
  const url = getJiraTaskUrl(entry.taskId);
  const taskCellClass = /^DFO-\d+$/.test(entry.taskId)
    ? dfoTaskColorMap[entry.taskId] + ' font-mono rounded px-2 py-1'
    : 'text-gray-500';

  return (
    <tr className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
      <td className="px-3 py-2 whitespace-nowrap text-center text-gray-900">{entry.date}</td>
      <td className="px-3 py-2 whitespace-nowrap text-center text-gray-900">{getDayOfWeek(entry.date)}</td>
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
          onChange={v => setEditedHours({ ...editedHours, [keyId]: v })}
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