import { useState, useMemo, useEffect } from 'react';
import type { LogEntry } from '../components/types';
import { LogTableRow } from './LogTable/LogTableRow';
import { getDayOfWeek } from '../components/utils';
import { getJiraIssuesDetails, getCachedJiraToken } from '../services/JiraIntegration';
import { getSetting } from './SettingsPage';
import type { RecurringEvent } from './RecurringEventsEditor';
import { Button } from './Button';

interface LogTableProps {
  entries: LogEntry[];
  editedHours: { [key: string]: string };
  setEditedHours: (v: { [key: string]: string }) => void;
  handleSendToJira: (entry: LogEntry) => void;
  weekStart?: string;
  weekEnd?: string;
}

interface LogTableSectionHeadingProps {
  weekStart: string;
  weekEnd: string;
}

// Helper to get recurring events from localStorage
function getRecurringEvents(): RecurringEvent[] {
  const stored = localStorage.getItem('recurringEvents');
  return stored ? JSON.parse(stored) : [];
}

function LogTableSectionHeading({ weekStart, weekEnd, onAddDailyScrum, onAddEvent, eventStates }: LogTableSectionHeadingProps & { onAddDailyScrum: () => void; onAddEvent: (event: RecurringEvent) => void; eventStates: Record<string, boolean> }) {
  const recurringEvents = getRecurringEvents();
  return (
    <tr className="bg-blue-50 border-b">
      <td colSpan={7} className="px-6 py-3 text-left align-middle">
        <div className="flex flex-row items-center justify-between w-full">
          <div className="flex flex-col">
            <span className="text-xl font-extrabold text-blue-700 tracking-tight drop-shadow">Week</span>
            <span className="text-lg font-semibold text-blue-600">{weekStart} – {weekEnd}</span>
          </div>
          <div className="flex gap-3">
            <Button
              className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold shadow hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onAddDailyScrum}
              disabled={eventStates['dailyScrum']}
            >
              Add daily scrum events
            </Button>
            {recurringEvents.map((ev: RecurringEvent) => (
              <Button
                key={ev.id}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold shadow hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => onAddEvent(ev)}
                disabled={eventStates[ev.id]}
              >
                Add {ev.name}
              </Button>
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
}

export function LogTable({ entries, editedHours, setEditedHours, handleSendToJira, weekStart, weekEnd }: LogTableProps) {
  // Sorting state
  const [sortColumn, setSortColumn] = useState<'date' | 'day' | 'task' | 'hours' | 'sent'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  // --- Extra rows for daily scrum and end sprint events ---
  const [extraRows, setExtraRows] = useState<LogEntry[]>([]);
  const [eventStates, setEventStates] = useState<Record<string, boolean>>({});

  // Helper to get all dates in week for a specific day name
  function getDatesForDayInWeek(start: string, end: string, dayName: string) {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const startDate = new Date(start);
    const endDate = new Date(end);
    const dates: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (days[d.getDay()] === dayName) {
        dates.push(d.toISOString().slice(0, 10));
      }
    }
    return dates;
  }

  // Helper to get all weekdays in week
  function getWeekDates(start: string, end: string) {
    const dates: string[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day >= 1 && day <= 5) { // Monday–Friday
        dates.push(d.toISOString().slice(0, 10));
      }
    }
    return dates;
  }

  // Add daily scrum events for every weekday
  const handleAddDailyScrum = () => {
    const taskId = getSetting('scrumTaskId');
    const minutes = parseFloat(getSetting('scrumDailyDurationMinutes'));
    const hours = minutes / 60;
    const weekDates = getWeekDates(weekStart!, weekEnd!);
    const newRows: LogEntry[] = weekDates.map(date => ({
      date,
      taskId,
      hours,
      sentToJira: false,
      eventName: 'Daily Scrum',
      eventId: 'dailyScrum',
    }));
    setExtraRows(prev => {
      // Avoid exact duplicates (same date and same eventId)
      const allRows = [...prev, ...newRows];
      const uniqueRows = allRows.filter((row, idx, arr) => arr.findIndex(r => r.date === row.date && r.eventId === row.eventId) === idx);
      return uniqueRows;
    });
    setEventStates(prev => ({ ...prev, dailyScrum: true }));
  };

  // Add recurring event for all matching days in the current week
  const handleAddEvent = (ev: RecurringEvent) => {
    // Use the configured taskId and also store the event name
    const taskId = getSetting('scrumTaskId');
    const minutes = parseFloat(ev.durationMinutes);
    const hours = minutes / 60;
    const dates = getDatesForDayInWeek(weekStart!, weekEnd!, ev.day);
    if (!dates.length) return;
    const newRows: LogEntry[] = dates.map(date => ({
      date,
      taskId,
      hours,
      sentToJira: false,
      eventName: ev.name, // Store the button name/event name
      eventId: ev.id, // Add a unique id for the event
    }));
    setExtraRows(prev => {
      // Avoid exact duplicates (same date and same eventId)
      const allRows = [...prev, ...newRows];
      const uniqueRows = allRows.filter((row, idx, arr) => arr.findIndex(r => r.date === row.date && r.eventId === row.eventId) === idx);
      return uniqueRows;
    });
    setEventStates(prev => ({ ...prev, [ev.id]: true }));
  };

  // Merge and sort all rows
  const allEntries = useMemo(() => {
    const merged = [...entries, ...extraRows];
    // Use the same sorting logic as sortedEntries
    merged.sort((a, b) => {
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
    return merged;
  }, [entries, extraRows, sortColumn, sortDirection]);

  return (
    <div className="overflow-x-auto w-full">
      <table className="min-w-full text-sm text-center w-auto">
        <thead>
          {weekStart && weekEnd ? (
            <LogTableSectionHeading
              weekStart={weekStart}
              weekEnd={weekEnd}
              onAddDailyScrum={handleAddDailyScrum}
              onAddEvent={handleAddEvent}
              eventStates={eventStates}
            />
          ) : null}
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
          {allEntries.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="text-center py-8 text-gray-400 text-lg">No entries in this range.</td>
            </tr>
          ) : (
            allEntries.map(entry => {
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
  );
}
