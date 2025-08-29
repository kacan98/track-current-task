// components/LogTable.tsx - Updated to use day grouping
import { useMemo } from 'react';
import type { LogEntry } from '../components/types';
import { useDayGrouping } from '../hooks/useDaysGrouping';
import { useExtraRows } from '../hooks/useExtraRows';
import { useJiraHeadings } from '../hooks/useJiraHeadings';
import { useJiraWorklogs } from '../hooks/useJiraWorklogs';
import { useSorting } from '../hooks/useSorting';
import { DayGroupHeader } from './LogTable/DayGroupHeader';
import { EmptyState } from './LogTable/EmptyState';
import { LogTableRow } from './LogTable/LogTableRow';
import { TableHeaders } from './LogTable/TableHeaders';
import { WeekHeader } from './LogTable/WeekHeader';
import React from 'react';
import { Toast } from './Toast';
import { useLogEntries } from '../contexts/LogEntriesContext';

export interface EditedHours {
  [key: string]: number;
}

function makeSentTaskKey(entry: LogEntry) {
  return `${entry.taskId}|${entry.date}|${entry.hours}`;
}

interface LogTableProps {
  entries: LogEntry[];
  handleSendEventToJira: (entry: LogEntry) => void;
  handleSendEventsToJira?: () => void;
  weekStart?: string;
  weekEnd?: string;
}

export function LogTable({
  entries,    
  handleSendEventToJira, 
  weekStart, 
  weekEnd,
  handleSendEventsToJira = () => {},
}: LogTableProps) {
  const { updateEntryHours, getEffectiveHours, getSentStatus } = useLogEntries();
  const { sortColumn, sortDirection, handleHeaderClick } = useSorting();
  const { extraRows, eventStates, handleAddDailyScrum, handleAddEvent, handleCloneExtraRow } = useExtraRows(weekStart, weekEnd);

  // Merge entries with extra rows first
  const allEntries = useMemo(() => {
    return [...entries, ...extraRows];
  }, [entries, extraRows]);

  // Use day grouping hook
  const dayGroups = useDayGrouping(allEntries);

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
    //start with the most recent date
    return Object.keys(dayGroups).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB.getTime() - dateA.getTime();
    });
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
          if (sortColumn === 'task') {
            cmp = a.taskId.localeCompare(b.taskId);
          } else if (sortColumn === 'hours') {
            cmp = Number(a.hours) - Number(b.hours);
          } else if (sortColumn === 'sent') {
            const aSent = getSentStatus(a.taskId, a.date, a.hours);
            const bSent = getSentStatus(b.taskId, b.date, b.hours);
            cmp = Number(aSent) - Number(bSent);
          }
          return sortDirection === 'asc' ? cmp : -cmp;
        })
      };
    });
    return sorted;
  }, [dayGroups, sortedDates, sortColumn, sortDirection, getSentStatus]);

  // Clone event handler
  const handleCloneEvent = (entry: LogEntry) => {
    handleCloneExtraRow(entry);
    // Optionally set edited hours for the clone if needed
  };

  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const toastTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg(null);
      toastTimeoutRef.current = null;
    }, 2500);
  };

  React.useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const handleSendEventToJiraWithToast = (entry: LogEntry) => {
    handleSendEventToJira(entry);
    showToast('Event sent!');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
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
              <EmptyState colSpan={5} />
            ) : (
              sortedDates.map(date => {
                const group = sortedDayGroups[date];
                return (
                  <React.Fragment key={date}>
                    <DayGroupHeader
                      date={date}
                      totalHours={group.totalHours}
                      entryCount={group.entries.length}
                    />
                    {group.entries.map((entry, idx) => {
                      // Only disable if this specific entry (taskId+date+hours) has been sent
                      const isSentToJira = getSentStatus(entry.taskId, entry.date, entry.hours);
                      return (
                        <LogTableRow
                          key={entry.keyId}
                          entry={entry}
                          keyId={entry.keyId}
                          taskColorMap={taskColorMap}
                          loadingHeadings={loadingHeadings}
                          headingsError={headingsError}
                          issueHeadings={issueHeadings}
                          loadingWorklogs={loadingWorklogs}
                          worklogError={worklogError}
                          worklogTotals={worklogTotals}
                          handleSendToJira={handleSendEventToJiraWithToast}
                          handleCloneEvent={handleCloneEvent}
                          isFirstInGroup={idx === 0}
                          isLastInGroup={idx === group.entries.length - 1}
                          isSentToJira={isSentToJira}
                        />
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}