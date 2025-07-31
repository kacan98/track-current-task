// components/LogTable.tsx - Updated to use day grouping
import { useMemo } from 'react';
import type { LogEntry } from '../components/types';
import { LogTableRow } from './LogTable/LogTableRow';
import { DayGroupHeader } from './LogTable/DayGroupHeader';
import { getDayOfWeek } from '../components/utils';
import { WeekHeader } from './LogTable/WeekHeader';
import { TableHeaders } from './LogTable/TableHeaders';
import { EmptyState } from './LogTable/EmptyState';
import { useJiraHeadings } from '../hooks/useJiraHeadings';
import { useJiraWorklogs } from '../hooks/useJiraWorklogs';
import { useExtraRows } from '../hooks/useExtraRows';
import { useSorting } from '../hooks/useSorting';
import { useDayGrouping } from '../hooks/useDaysGrouping';

export interface EditedHours {
  [key: string]: number; // key format: taskId|date or taskId|date|eventId
}

interface LogTableProps {
  entries: LogEntry[];
  editedHours: EditedHours;
  setEditedHours: (v: EditedHours) => void;
  handleSendEventToJira: (entry: LogEntry) => void;
  handleSendEventsToJira?: () => void;
  weekStart?: string;
  weekEnd?: string;
}

export function LogTable({
  entries, 
  editedHours, 
  setEditedHours, 
  handleSendEventToJira: handleSendToJira, 
  weekStart, 
  weekEnd,
  handleSendEventsToJira = () => {},
}: LogTableProps) {
  const { sortColumn, sortDirection, handleHeaderClick } = useSorting();
  const { extraRows, eventStates, handleAddDailyScrum, handleAddEvent } = useExtraRows(weekStart, weekEnd);

  // Merge entries with extra rows first
  const allEntries = useMemo(() => {
    return [...entries, ...extraRows];
  }, [entries, extraRows]);

  // Use day grouping hook
  const dayGroups = useDayGrouping(allEntries, editedHours);

  // Detect all unique DFO-1234 task IDs in the entries
  const taskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of allEntries) {
      if (/^DFO-\d+$/.test(entry.taskId)) ids.add(entry.taskId);
    }
    return Array.from(ids);
  }, [allEntries]);

  const { issueHeadings, loadingHeadings, headingsError } = useJiraHeadings(taskIds);
  const { worklogTotals, loadingWorklogs, worklogError } = useJiraWorklogs(allEntries, taskIds);

  // Color coding for same tasks
  const taskColorMap = useMemo(() => {
    const ids = taskIds;
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
  }, [taskIds.join(',')]);

  // Sort dates for consistent display
  const sortedDates = useMemo(() => {
    return Object.keys(dayGroups).sort();
  }, [dayGroups]);

  // Sort entries within each day
  const sortedDayGroups = useMemo(() => {
    const sorted: typeof dayGroups = {};
    sortedDates.forEach(date => {
      const group = dayGroups[date];
      sorted[date] = {
        ...group,
        entries: [...group.entries].sort((a, b) => {
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
        })
      };
    });
    return sorted;
  }, [dayGroups, sortedDates, sortColumn, sortDirection]);

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
                sendEventsToJira={handleSendEventsToJira}
              />
            )}
            <TableHeaders
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onHeaderClick={handleHeaderClick}
            />
          </thead>
          <tbody>
            {sortedDates.length === 0 ? (
              <EmptyState colSpan={7} />
            ) : (
              sortedDates.map(date => {
                const group = sortedDayGroups[date];
                return (
                  <>
                    <DayGroupHeader
                      date={date}
                      totalHours={group.totalHours}
                      entryCount={group.entries.length}
                      key={date}
                    />
                    {group.entries.map((entry, idx) => (
                      <LogTableRow
                        key={entry.keyId}
                        entry={entry}
                        keyId={entry.keyId}
                        taskColorMap={taskColorMap}
                        editedHours={editedHours}
                        setEditedHours={setEditedHours}
                        loadingHeadings={loadingHeadings}
                        headingsError={headingsError}
                        issueHeadings={issueHeadings}
                        loadingWorklogs={loadingWorklogs}
                        worklogError={worklogError}
                        worklogTotals={worklogTotals}
                        handleSendToJira={handleSendToJira}
                        isFirstInGroup={idx === 0}
                        isLastInGroup={idx === group.entries.length - 1}
                        showDateColumn={idx === 0} // Only show date on first entry of each day
                      />
                    ))}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}