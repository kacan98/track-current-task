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
    : 'text-gray-300';

  return (
    <tr className="border-t hover:bg-blue-50 transition-colors">
      <td className="px-3 py-2 whitespace-nowrap text-center">{entry.date}</td>
      <td className="px-3 py-2 whitespace-nowrap text-center">{getDayOfWeek(entry.date)}</td>
      <td className={`px-3 py-2 whitespace-nowrap text-center ${taskCellClass}`}>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="underline">{entry.taskId}</a>
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
        {entry.sentToJira ? <span className="text-green-600">✅</span> : <span className="text-red-400">❌</span>}
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex justify-center items-center">
          <Button
            className={`group relative flex items-center gap-2 px-4 py-2 rounded-full font-semibold shadow-md transition-all duration-150
              ${entry.sentToJira
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-200'
                : 'bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 border border-blue-600 cursor-pointer'}
            `}
            disabled={entry.sentToJira}
            onClick={() => handleSendToJira(entry)}
            aria-label={entry.sentToJira ? 'Already sent to Jira' : 'Send to Jira'}
          >
            <span className="material-symbols-outlined text-lg pointer-events-none">
              {entry.sentToJira ? 'check_circle' : 'send'}
            </span>
            <span>{entry.sentToJira ? 'Sent' : 'Send'}</span>
            {!entry.sentToJira && (
              <span className="absolute left-0 top-0 w-full h-full rounded-full opacity-0 group-hover:opacity-10 bg-white transition-opacity duration-200 pointer-events-none"></span>
            )}
          </Button>
        </div>
      </td>
    </tr>
  );
}
