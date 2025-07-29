import { useState, useMemo, useEffect } from 'react';
import type { LogEntry } from '../components/types';
import { LogTableRow } from './LogTable/LogTableRow';
import { getDayOfWeek } from '../components/utils';
import { getJiraIssuesDetails, getCachedJiraToken } from '../services/JiraIntegration';

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

  // --- Jira worklog totals state ---
  const [worklogTotals, setWorklogTotals] = useState<Record<string, number>>({});
  const [loadingWorklogs, setLoadingWorklogs] = useState<Record<string, boolean>>({});
  const [worklogError, setWorklogError] = useState<Record<string, string>>({});

  // For each row (taskId+date), fetch total hours registered in Jira for that task on that day
  useEffect(() => {
    let cancelled = false;
    // Find all unique (taskId, date) pairs for DFO tasks
    const pairs = entries
      .filter(e => /^DFO-\d+$/.test(e.taskId))
      .map(e => ({ taskId: e.taskId, date: e.date }));
    const uniquePairs = Array.from(new Set(pairs.map(p => `${p.taskId}|${p.date}`)))
      .map(k => {
        const [taskId, date] = k.split('|');
        return { taskId, date };
      });
    if (uniquePairs.length === 0) {
      setWorklogTotals({});
      setLoadingWorklogs({});
      setWorklogError({});
      return;
    }
    setLoadingWorklogs(Object.fromEntries(uniquePairs.map(({taskId, date}) => [`${taskId}|${date}`, true])));
    setWorklogError({});
    // For each unique taskId, fetch all worklogs, then filter by date
    Promise.all(
      dfoTaskIds.map(async taskId => {
        try {
          // Get all worklogs for this issue
          // 1. Fetch issue worklogs (returns worklog IDs)
          const res = await fetch(`http://localhost:9999/api/jira/issues/details`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: getCachedJiraToken(), issueKeys: [taskId], fields: ['worklog'] })
          });
          if (!res.ok) throw new Error('Failed to fetch worklogs');
          const data = await res.json();
          const worklogs = data.issues?.[0]?.fields?.worklog?.worklogs || [];
          if (!Array.isArray(worklogs) || worklogs.length === 0) return { taskId, worklogs: [] };
          return { taskId, worklogs };
        } catch (e: any) {
          return { taskId, worklogs: [], error: e?.message || 'Failed to fetch worklogs' };
        }
      })
    ).then(async results => {
      if (cancelled) return;
      // Flatten all worklogs and map to (taskId, date, timeSpentSeconds)
      const allWorklogs = results.flatMap(r =>
        (r.worklogs || []).map((w: any) => ({
          taskId: r.taskId,
          started: w.started,
          timeSpentSeconds: w.timeSpentSeconds
        }))
      );
      // For each unique (taskId, date), sum timeSpentSeconds for worklogs started on that date
      const totals: Record<string, number> = {};
      for (const { taskId, date } of uniquePairs) {
        const total = allWorklogs
          .filter(w => w.taskId === taskId && w.started && w.started.startsWith(date))
          .reduce((sum, w) => sum + (w.timeSpentSeconds || 0), 0);
        totals[`${taskId}|${date}`] = total;
      }
      setWorklogTotals(totals);
      setLoadingWorklogs(Object.fromEntries(uniquePairs.map(({taskId, date}) => [`${taskId}|${date}`, false])));
    });
    return () => { cancelled = true; };
  }, [entries]);

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
              sortedEntries.map(entry => {
                const keyId = `${entry.taskId}|${entry.date}`;
                return (
                  <LogTableRow
                    key={keyId}
                    entry={entry}
                    keyId={keyId}
                    dfoTaskColorMap={dfoTaskColorMap}
                    editedHours={editedHours}
                    setEditedHours={setEditedHours}
                    loadingHeadings={loadingHeadings}
                    headingsError={headingsError}
                    issueHeadings={issueHeadings}
                    loadingWorklogs={loadingWorklogs}
                    worklogError={worklogError}
                    worklogTotals={worklogTotals}
                    handleSendToJira={handleSendToJira}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
