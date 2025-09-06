// components/LogTable.tsx - Updated to use day grouping
import { useMemo, useState, useEffect } from 'react';
import type { LogEntry } from '@/types';
import { useExtraRows } from '@/hooks/useExtraRows';
import { useJiraHeadings } from '@/hooks/useJiraHeadings';
import { useJiraWorklogs } from '@/hooks/useJiraWorklogs';
import { DayGroupHeader } from './LogTable/DayGroupHeader';
import { EmptyState } from './LogTable/EmptyState';
import { LogTableRow } from './LogTable/LogTableRow';
import { TABLE_COLUMNS } from './LogTable/tableConfig';
import { WeekHeader } from './LogTable/WeekHeader';
import React from 'react';
import { Toast } from '@/components/ui/Toast';
import { useLogEntries } from '@/contexts/LogEntriesContext';
import { createEntry } from '@/utils/entryUtils';
import { useSettings } from '@/contexts/SettingsContext';
import { CommitsModal } from '@/components/modals/CommitsModal';
import { GitHubAuthModal } from '@/components/modals/GitHubAuthModal';
import { commitService } from '@/services/commitService';
import { useGitHubAuth } from '@/contexts/GitHubAuthContext';
import { isValidTaskId } from '@/utils/jiraUtils';

export interface EditedHours {
  [key: string]: number;
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
  const { eventStates, handleAddDailyScrum, handleAddEvent } = useExtraRows(weekStart, weekEnd);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [commitsModalDate, setCommitsModalDate] = useState<string | null>(null);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showGitHubAuth, setShowGitHubAuth] = useState(false);
  const { isAuthenticated, getCommitsForDate } = useGitHubAuth();
  const settings = useSettings();

  // Initialize commit service
  useEffect(() => {
    if (isAuthenticated) {
      commitService.initialize(getCommitsForDate);
      // Close GitHub auth modal if it's open when user becomes authenticated
      setShowGitHubAuth(false);
    }
  }, [isAuthenticated, getCommitsForDate]);

  const handleAddTask = (date: string) => {
    const newEntry = createEntry('', date, 0.5);
    addEntry(newEntry);
  };

  const handleAddLogEntry = (entry: { date: string; taskId: string; duration: number; description: string }) => {
    const newEntry = createEntry(entry.taskId, entry.date, entry.duration);
    addEntry(newEntry);
    setCommitsModalDate(null); // Close modal after adding
  };

  const handleAutoFillWeek = async () => {
    if (!weekStart || !settings) {
      setToastMsg('Week start date or settings not available');
      return;
    }

    // If not authenticated, show GitHub auth modal
    if (!isAuthenticated) {
      setShowGitHubAuth(true);
      return;
    }

    setIsAutoFilling(true);
    try {
      const commitSettings = {
        dayStartTime: settings.getSetting('dayStartTime') || '09:00',
        dayEndTime: settings.getSetting('dayEndTime') || '17:00',
        taskIdRegex: settings.getSetting('taskIdRegex') || ''
      };

      const result = await commitService.autoFillWeek(
        weekStart,
        handleAddLogEntry,
        commitSettings
      );

      setToastMsg(`Auto-fill completed! Processed ${result.processed} days, added ${result.added} log entries.`);
    } catch (error) {
      console.error('Auto-fill failed:', error);
      setToastMsg(`Auto-fill failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAutoFilling(false);
    }
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

  // Group entries by day
  const dayGroups = useMemo(() => {
    const groups: { [date: string]: { entries: LogEntry[], totalHours: number } } = {};
    
    entries.forEach((entry) => {
      if (!groups[entry.date]) {
        groups[entry.date] = { entries: [], totalHours: 0 };
      }
      
      groups[entry.date].entries.push(entry);
      groups[entry.date].totalHours += entry.hours || 0;
    });
    
    return groups;
  }, [entries]);

  // Detect all unique task IDs in the entries based on configured pattern
  const taskIds = useMemo(() => {
    const ids = new Set<string>();
    const taskIdRegex = settings?.getSetting('taskIdRegex');
    if (taskIdRegex) {
      for (const entry of entries) {
        if (isValidTaskId(entry.taskId, taskIdRegex)) {
          ids.add(entry.taskId);
        }
      }
    }
    return Array.from(ids);
  }, [entries, settings]);

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
  }, [taskIds]);

  // Helper function to check if a date is a weekend
  const isWeekend = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    return day === 0 || day === 6;
  };

  // Generate all dates in the week range, even if empty
  const allDatesInRange = useMemo(() => {
    const hideWeekends = settings?.getBooleanSetting('hideWeekends') || false;
    
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
  }, [dayGroups, weekStart, weekEnd, settings]);

  // Create day groups with default sorting (no complex sorting logic)
  const sortedDayGroups = useMemo(() => {
    const sorted: typeof dayGroups = {};
    allDatesInRange.forEach(date => {
      const group = dayGroups[date];
      if (group) {
        sorted[date] = {
          ...group,
          entries: [...group.entries] // Keep entries in their original order
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
  }, [dayGroups, allDatesInRange]);


  const toastTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);


  React.useEffect(() => {
    const timeoutRef = toastTimeoutRef;
    return () => {
      const timeoutId = timeoutRef.current;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);


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
                hasScrumTaskId={!!(settings?.getSetting('scrumTaskId') || '').trim()}
                onAutoFillWeek={handleAutoFillWeek}
                isAutoFilling={isAutoFilling}
              />
            )}
            <tr className="bg-gray-50 border-b border-gray-200">
              {TABLE_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className={`px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider ${column.width || ''} ${column.hideOnMobile ? 'hidden sm:table-cell' : ''}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody onDragLeave={handleDragLeave}>
            {allDatesInRange.length === 0 ? (
              <EmptyState colSpan={TABLE_COLUMNS.length} />
            ) : (
              allDatesInRange.map(date => {
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
                            {...(onSendToJira ? { handleSendToJira: onSendToJira } : {})}
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
          onAddLogEntry={handleAddLogEntry}
        />
      )}

      {showGitHubAuth && (
        <GitHubAuthModal
          title="Connect GitHub for Auto-fill Week"
          onClose={() => setShowGitHubAuth(false)}
        />
      )}
    </div>
  );
}