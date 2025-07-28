import { getDayOfWeek } from '../components/utils';
import type { LogEntry } from '../components/types';
import { Button } from './Button';
import { HourAdjustButtons } from './HourAdjustButtons';
import { getJiraTaskUrl } from './jira-utils';

interface LogTableProps {
  entries: LogEntry[];
  editedHours: { [key: string]: string };
  setEditedHours: (v: { [key: string]: string }) => void;
  handleSendToJira: (entry: LogEntry) => void;
}

export function LogTable({ entries, editedHours, setEditedHours, handleSendToJira }: LogTableProps) {
  return (
    <div className="overflow-x-auto w-full">
      <table className="min-w-full text-sm text-center w-auto">
        <thead>
          <tr className="bg-blue-50 border-b">
            {['Date', 'Day', 'Task', 'Hours', 'Sent', 'Action'].map(h => (
              <th key={h} className="px-3 py-2 font-semibold text-blue-900/80 text-center">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-8 text-gray-400 text-lg">No entries in this range.</td>
            </tr>
          ) : (
            entries.map((entry, i) => {
              const key = `${entry.taskId}|${entry.date}`;
              return (
                <tr key={i} className="border-t hover:bg-blue-50 transition-colors">
                  <td className="px-3 py-2 whitespace-nowrap text-center">{entry.date}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">{getDayOfWeek(entry.date)}</td>
                  <td className="px-3 py-2 font-mono text-blue-800/90 whitespace-nowrap text-center">
                    {(() => {
                      const url = getJiraTaskUrl(entry.taskId);
                      return url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="underline text-blue-700 hover:text-blue-900">{entry.taskId}</a>
                      ) : (
                        entry.taskId
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <HourAdjustButtons
                      value={editedHours[key] !== undefined ? editedHours[key] : entry.hours}
                      onChange={v => setEditedHours({ ...editedHours, [key]: v })}
                      disabled={entry.sentToJira}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">{entry.sentToJira ? <span className="text-green-600">✅</span> : <span className="text-red-400">❌</span>}</td>
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
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
