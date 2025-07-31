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

export interface EditedHours {
  [key: string]: number;
}

function makeSentTaskKey(entry: LogEntry) {
  return `${entry.taskId}|${entry.date}|${entry.hours}`;
}

interface LogTableProps {
  entries: LogEntry[];
  editedHours: EditedHours;
  setEditedHours: (v: EditedHours) => void;
  handleSendEventToJira: (entry: LogEntry) => void;
  handleSendEventsToJira?: () => void;
  weekStart?: string;
  weekEnd?: string;
  sentTasks: Record<string, LogEntry>;
}

export function LogTable({
  entries,    
  editedHours, 
  setEditedHours, 
  handleSendEventToJira, 
  weekStart, 
  weekEnd,
  handleSendEventsToJira = () => {},
  sentTasks,
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
            const aKey = `${a.taskId}|${a.date}`;
            const bKey = `${b.taskId}|${b.date}`;
            const aSent = !!sentTasks[aKey];
            const bSent = !!sentTasks[bKey];
            cmp = Number(aSent) - Number(bSent);
          }
          return sortDirection === 'asc' ? cmp : -cmp;
        })
      };
    });
    return sorted;
  }, [dayGroups, sortedDates, sortColumn, sortDirection, sentTasks]);

  // Clone event handler
  const handleCloneEvent = (entry: LogEntry) => {
    // Create a new keyId for the cloned entry
    const newKeyId = `${entry.taskId}|${entry.date}|${entry.hours}|${Math.random().toString(36).slice(2, 8)}`;
    const clonedEntry = {
      ...entry,
      keyId: newKeyId,
      // Optionally reset sent status if tracked in entry
    };
    // Add to extraRows (or entries if you want)
    setEditedHours({ ...editedHours, [newKeyId]: entry.hours });
    // If you want to add to extraRows, you may need to update extraRows state in useExtraRows
    // For now, just add to entries (if entries is stateful), otherwise you may need to lift state up
    // This is a placeholder: you may need to handle this in useExtraRows or parent
    // alert('Cloned!');
  };

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
                      const key = makeSentTaskKey(entry);
                      // Only disable if this specific entry (taskId+date+hours) has been sent
                      const isSentToJira = !!sentTasks[key];
                      return (
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
                          handleSendToJira={handleSendEventToJira}
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