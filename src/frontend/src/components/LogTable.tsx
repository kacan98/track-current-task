import { useState, useMemo, useEffect } from 'react';
import { getDayOfWeek } from '../components/utils';
import type { LogEntry } from '../components/types';
import { Button } from './Button';
import { HourAdjustButtons } from './HourAdjustButtons';
import { getJiraTaskUrl } from './jira-utils';
import { getJiraIssuesDetails } from '../services/JiraIntegration';

interface LogTableProps {
  entries: LogEntry[];
  editedHours: { [key: string]: string };
  setEditedHours: (v: { [key: string]: string }) => void;
  handleSendToJira: (entry: LogEntry) => void;
}

export function LogTable({ entries, editedHours, setEditedHours, handleSendToJira }: LogTableProps) {
  // Sorting state
  const [sortColumn, setSortColumn] = useState<'date' | 'day' | 'task' | 'hours' | 'sent'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sorting logic
  const sortedEntries = useMemo(() => {
    const sorted = [...entries];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortColumn === 'date') {
        cmp = a.date.localeCompare(b.date);
      } else if (sortColumn === 'day') {
        cmp = getDayOfWeek(a.date).localeCompare(getDayOfWeek(b.date));
      } else if (sortColumn === 'task') {
        cmp = a.taskId.localeCompare(b.taskId);
      } else if (sortColumn === 'hours') {
        cmp = Number(a.hours) - Number(b.hours);
      } else if (sortColumn === 'sent') {
        cmp = Number(a.sentToJira) - Number(b.sentToJira);
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [entries, sortColumn, sortDirection]);

  // --- Jira headings state ---
  const [issueHeadings, setIssueHeadings] = useState<Record<string, string>>({});
  const [loadingHeadings, setLoadingHeadings] = useState<Record<string, boolean>>({});
  const [headingsError, setHeadingsError] = useState<Record<string, string>>({});

  // Detect all unique DFO-1234 task IDs in the entries
  const dfoTaskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of entries) {
      if (/^DFO-\d+$/.test(entry.taskId)) ids.add(entry.taskId);
    }
    return Array.from(ids);
  }, [entries]);

  // Fetch Jira headings for DFO-1234 tasks
  useEffect(() => {
    let cancelled = false;
    if (dfoTaskIds.length === 0) {
      setIssueHeadings({});
      setLoadingHeadings({});
      setHeadingsError({});
      return;
    }
    // Set loading state for all
    setLoadingHeadings(Object.fromEntries(dfoTaskIds.map(id => [id, true])));
    setHeadingsError({});
    getJiraIssuesDetails(dfoTaskIds)
      .then(issues => {
        if (cancelled) return;
        const headings: Record<string, string> = {};
        for (const issue of issues) {
          headings[issue.key] = issue.fields?.summary || '(No summary)';
        }
        setIssueHeadings(headings);
        setLoadingHeadings(Object.fromEntries(dfoTaskIds.map(id => [id, false])));
      })
      .catch(e => {
        if (cancelled) return;
        const errMsg = e?.message || 'Failed to fetch Jira headings';
        setHeadingsError(Object.fromEntries(dfoTaskIds.map(id => [id, errMsg])));
        setLoadingHeadings(Object.fromEntries(dfoTaskIds.map(id => [id, false])));
      });
    return () => { cancelled = true; };
  }, [dfoTaskIds.join(',')]);

  // --- Color coding for same tasks ---
  // Assign a color to each unique DFO-1234 taskId
  const dfoTaskColorMap = useMemo(() => {
    const ids = dfoTaskIds;
    const palette = [
      'bg-yellow-100 text-yellow-900',
      'bg-green-100 text-green-900',
      'bg-blue-100 text-blue-900',
      'bg-pink-100 text-pink-900',
      'bg-purple-100 text-purple-900',
      'bg-orange-100 text-orange-900',
      'bg-teal-100 text-teal-900',
      'bg-red-100 text-red-900',
      'bg-indigo-100 text-indigo-900',
      'bg-lime-100 text-lime-900',
      'bg-cyan-100 text-cyan-900',
      'bg-fuchsia-100 text-fuchsia-900',
    ];
    const map: Record<string, string> = {};
    ids.forEach((id, i) => {
      map[id] = palette[i % palette.length];
    });
    return map;
  }, [dfoTaskIds.join(',')]);

  // Header config
  const headers = [
    { key: 'date', label: 'Date' },
    { key: 'day', label: 'Day' },
    { key: 'task', label: 'Task' },
    { key: 'heading', label: 'Heading' },
    { key: 'hours', label: 'Hours' },
    { key: 'sent', label: 'Sent' },
    { key: 'action', label: 'Action', sortable: false },
  ];

  const handleHeaderClick = (key: string) => {
    if (key === 'action') return;
    if (sortColumn === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(key as any);
      setSortDirection(key === 'date' ? 'desc' : 'asc');
    }
  };

  return (
    <>
      <div className="overflow-x-auto w-full">
        <table className="min-w-full text-sm text-center w-auto">
          <thead>
            <tr className="bg-blue-50 border-b">
              {headers.map(h => (
                <th
                  key={h.key}
                  className={`px-3 py-2 font-semibold text-blue-900/80 text-center select-none ${h.sortable === false ? '' : 'cursor-pointer hover:bg-blue-100'}`}
                  onClick={() => handleHeaderClick(h.key)}
                >
                  {h.label}
                  {h.key === sortColumn && (
                    <span className="ml-1">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedEntries.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="text-center py-8 text-gray-400 text-lg">No entries in this range.</td>
              </tr>
            ) : (
              sortedEntries.map((entry, i) => {
                const key = `${entry.taskId}|${entry.date}`;
                // --- Heading cell logic ---
                let headingCell: React.ReactNode = '';
                let taskCellClass = '';
                if (/^DFO-\d+$/.test(entry.taskId)) {
                  taskCellClass = dfoTaskColorMap[entry.taskId] + ' font-mono rounded px-2 py-1';
                  if (loadingHeadings[entry.taskId]) {
                    headingCell = <span className="italic text-blue-400">Loading...</span>;
                  } else if (headingsError[entry.taskId]) {
                    headingCell = <span className="text-red-500">{headingsError[entry.taskId]}</span>;
                  } else {
                    headingCell = issueHeadings[entry.taskId] || <span className="text-gray-400">Not found</span>;
                  }
                } else {
                  taskCellClass = 'text-gray-300';
                  headingCell = <span className="text-gray-300">—</span>;
                }
                return (
                  <tr key={i} className="border-t hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap text-center">{entry.date}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">{getDayOfWeek(entry.date)}</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-center ${taskCellClass}`}>
                      {(() => {
                        const url = getJiraTaskUrl(entry.taskId);
                        return url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="underline">{entry.taskId}</a>
                        ) : (
                          entry.taskId
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2 text-center">{headingCell}</td>
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
    </>
  );
}
