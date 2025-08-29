// components/LogTable.tsx - Updated to use day grouping
import { useMemo, useState } from 'react';
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
import { createEntry } from '../utils/entryUtils';
import { getBooleanSetting } from './SettingsPage';
import { CommitsModal } from './CommitsModal';

export interface EditedHours {
  [key: string]: number;
}

function makeSentTaskKey(entry: LogEntry) {
  return `${entry.taskId}|${entry.date}|${entry.hours}`;
}

interface LogTableProps {
  entries: LogEntry[];
  weekStart?: string;
  weekEnd?: string;
  onSendToJira?: (entry: LogEntry) => void;
}

export function LogTable({
  entries,    
  weekStart, 
  weekEnd,
  onSendToJira,
}: LogTableProps) {
  const { deleteEntry, cloneEntry, updateEntryDate, addEntry } = useLogEntries();
  const { sortColumn, sortDirection, handleHeaderClick } = useSorting();
  const { eventStates, handleAddDailyScrum, handleAddEvent, handleCloneExtraRow } = useExtraRows(weekStart, weekEnd);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [commitsModalDate, setCommitsModalDate] = useState<string | null>(null);

  const handleAddTask = (date: string) => {
    const newEntry = createEntry('', date, 0.5);
    addEntry(newEntry);
  };

  const handleViewCommits = (date: string) => {
    setCommitsModalDate(date);
  };

  const handleDragOver = (date: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDate(date);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the table entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !relatedTarget.closest('tbody')) {
      setDragOverDate(null);
    }
  };

  const handleDrop = (date: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const entryId = e.dataTransfer.getData('entryId');
    if (entryId) {
      updateEntryDate(entryId, date);
    }
    setDragOverDate(null);
  };

  const handleDragEnd = () => {
    // Clear any lingering highlights when drag ends
    setDragOverDate(null);
  };

  // Use day grouping hook
  const dayGroups = useDayGrouping(entries);

  // Detect all unique DFO-1234 task IDs in the entries
  const taskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of entries) {
      if (/^DFO-\d+$/.test(entry.taskId)) ids.add(entry.taskId);
    }
    return Array.from(ids);
  }, [entries]);

  const { issueHeadings, loadingHeadings, headingsError } = useJiraHeadings(taskIds);
  const { worklogTotals, loadingWorklogs, worklogError } = useJiraWorklogs(entries, taskIds);

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

  // Helper function to check if a date is a weekend
  const isWeekend = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    return day === 0 || day === 6;
  };

  // Generate all dates in the week range, even if empty
  const allDatesInRange = useMemo(() => {
    const hideWeekends = getBooleanSetting('hideWeekends');
    
    if (!weekStart || !weekEnd) {
      // If no week range specified, just use dates that have entries
      const existingDates = Object.keys(dayGroups).sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateB.getTime() - dateA.getTime();
      });
      
      return hideWeekends ? existingDates.filter(date => !isWeekend(date)) : existingDates;
    }
    
    const dates: string[] = [];
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      if (!hideWeekends || !isWeekend(dateStr)) {
        dates.push(dateStr);
      }
    }
    
    // Sort with most recent first
    return dates.sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB.getTime() - dateA.getTime();
    });
  }, [dayGroups, weekStart, weekEnd]);

  // Sort dates for consistent display
  const sortedDates = allDatesInRange;

  // Sort entries within each day (create empty groups for dates without entries)
  const sortedDayGroups = useMemo(() => {
    const sorted: typeof dayGroups = {};
    sortedDates.forEach(date => {
      const group = dayGroups[date];
      if (group) {
        sorted[date] = {
          ...group,
          entries: [...group.entries].sort((a, b) => {
            let cmp = 0;
            if (sortColumn === 'task') {
              cmp = a.taskId.localeCompare(b.taskId);
            } else if (sortColumn === 'hours') {
              cmp = Number(a.hours) - Number(b.hours);
            }
            return sortDirection === 'asc' ? cmp : -cmp;
          })
        };
      } else {
        // Create empty group for dates without entries
        sorted[date] = {
          entries: [],
          totalHours: 0
        };
      }
    });
    return sorted;
  }, [dayGroups, sortedDates, sortColumn, sortDirection]);

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
              />
            )}
            <TableHeaders
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onHeaderClick={handleHeaderClick}
            />
          </thead>
          <tbody onDragLeave={handleDragLeave}>
            {sortedDates.length === 0 ? (
              <EmptyState colSpan={6} />
            ) : (
              sortedDates.map(date => {
                const group = sortedDayGroups[date];
                const isDragOver = dragOverDate === date;
                return (
                  <React.Fragment key={date}>
                    <DayGroupHeader
                      date={date}
                      totalHours={group.totalHours}
                      entryCount={group.entries.length}
                      isDragOver={isDragOver}
                      onAddTask={handleAddTask}
                      onViewCommits={handleViewCommits}
                      onDragOver={handleDragOver(date)}
                      onDrop={handleDrop(date)}
                    />
                    {group.entries.map((entry, idx) => {
                      return (
                        <LogTableRow
                          key={entry.id}
                          entry={entry}
                          taskColorMap={taskColorMap}
                          loadingHeadings={loadingHeadings}
                          headingsError={headingsError}
                          issueHeadings={issueHeadings}
                          loadingWorklogs={loadingWorklogs}
                          worklogError={worklogError}
                          worklogTotals={worklogTotals}
                          handleDeleteEntry={deleteEntry}
                          handleSendToJira={onSendToJira}
                          handleCloneEntry={cloneEntry}
                          isFirstInGroup={idx === 0}
                          isLastInGroup={idx === group.entries.length - 1}
                          isDragOver={isDragOver}
                          onDragOver={handleDragOver(date)}
                          onDrop={handleDrop(date)}
                          onDragEnd={handleDragEnd}
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
      
      {commitsModalDate && (
        <CommitsModal
          date={commitsModalDate}
          onClose={() => setCommitsModalDate(null)}
        />
      )}
    </div>
  );
}