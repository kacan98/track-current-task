import { useMemo } from 'react';
import type { LogEntry } from '../components/types';
import { LogTableRow } from './LogTable/LogTableRow';
import { getDayOfWeek } from '../components/utils';
import { WeekHeader } from './LogTable/WeekHeader';
import { TableHeaders } from './LogTable/TableHeaders';
import { EmptyState } from './LogTable/EmptyState';
import { useJiraHeadings } from '../hooks/useJiraHeadings';
import { useJiraWorklogs } from '../hooks/useJiraWorklogs';
import { useExtraRows } from '../hooks/useExtraRows';
import { useSorting } from '../hooks/useSorting';

interface LogTableProps {
  entries: LogEntry[];
  editedHours: { [key: string]: string };
  setEditedHours: (v: { [key: string]: string }) => void;
  handleSendToJira: (entry: LogEntry) => void;
  weekStart?: string;
  weekEnd?: string;
}

// Component
export function LogTable({ 
  entries, 
  editedHours, 
  setEditedHours, 
  handleSendToJira, 
  weekStart, 
  weekEnd 
}: LogTableProps) {
  const { sortColumn, sortDirection, handleHeaderClick } = useSorting();
  const { extraRows, eventStates, handleAddDailyScrum, handleAddEvent } = useExtraRows(weekStart, weekEnd);

  // Detect all unique DFO-1234 task IDs in the entries
  const dfoTaskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of entries) {
      if (/^DFO-\d+$/.test(entry.taskId)) ids.add(entry.taskId);
    }
    return Array.from(ids);
  }, [entries]);

  const { issueHeadings, loadingHeadings, headingsError } = useJiraHeadings(dfoTaskIds);
  const { worklogTotals, loadingWorklogs, worklogError } = useJiraWorklogs(entries, dfoTaskIds);

  // Color coding for same tasks
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

  // Merge and sort all rows
  const allEntries = useMemo(() => {
    const merged = [...entries, ...extraRows];
    // Sort entries
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            {weekStart && weekEnd && (
              <WeekHeader
                weekStart={weekStart}
                weekEnd={weekEnd}
                onAddDailyScrum={handleAddDailyScrum}
                onAddEvent={handleAddEvent}
                eventStates={eventStates}
              />
            )}
            <TableHeaders
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onHeaderClick={handleHeaderClick}
            />
          </thead>
          <tbody>
            {allEntries.length === 0 ? (
              <EmptyState colSpan={7} />
            ) : (
              allEntries.map((entry, idx) => {
                // Guarantee unique key for each row
                const keyId = `${entry.taskId}|${entry.date}${entry.eventId ? `|${entry.eventId}` : entry.eventName ? `|${entry.eventName}` : `|${idx}`}`;
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
    </div>
  );
}