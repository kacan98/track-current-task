import React, { useMemo, useState, useEffect } from 'react';
import { TaskGridHeader } from './TaskGridHeader';
import { TaskGridRow } from './TaskGridRow';
import { useLogEntries } from '@/contexts/LogEntriesContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useJiraHeadings } from '@/hooks/useJiraHeadings';
import { useExtraRows } from '@/hooks/useExtraRows';
import { useGitHubAuth } from '@/contexts/GitHubAuthContext';
import { Button } from '@/components/ui/Button';
import { EmptyCell } from '@/components/ui/PlusButton';
import { Toast } from '@/components/ui/Toast';
import { CommitsModal } from '@/components/modals/CommitsModal';
import { GitHubAuthModal } from '@/components/modals/GitHubAuthModal';
import { TaskIdRegexModal } from '@/components/modals/TaskIdRegexModal';
import { commitService } from '@/services/commitService';
import { createEntry } from '@/utils/entryUtils';
import type { LogEntry } from '@/types';
import type { RecurringEvent } from '@/components/RecurringEventsEditor';

function getRecurringEvents(): RecurringEvent[] {
  const stored = localStorage.getItem('recurringEvents');
  return stored ? JSON.parse(stored) : [];
}

interface TaskGridWeekProps {
  entries: LogEntry[];
  weekStart: string;
  weekEnd: string;
  onSendToJira: (entry: LogEntry) => void;
}

export const TaskGridWeek: React.FC<TaskGridWeekProps> = ({
  entries,
  weekStart,
  weekEnd,
  onSendToJira
}) => {
  const { addEntry, updateEntryHours, deleteEntry, updateEntryTaskId } = useLogEntries();
  const settings = useSettings();
  const { eventStates, handleAddDailyScrum, handleAddEvent } = useExtraRows(weekStart, weekEnd);
  const { isAuthenticated, getCommitsForDate } = useGitHubAuth();
  const recurringEvents = getRecurringEvents();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [sendingToJira, setSendingToJira] = useState(false);
  const [commitsModalDate, setCommitsModalDate] = useState<string | null>(null);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [showGitHubAuth, setShowGitHubAuth] = useState(false);
  const [showTaskIdRegexModal, setShowTaskIdRegexModal] = useState(false);
  const [hasAutoFilled, setHasAutoFilled] = useState(false);

  // Initialize commit service
  useEffect(() => {
    if (isAuthenticated) {
      commitService.initialize(getCommitsForDate);
      setShowGitHubAuth(false);
    }
  }, [isAuthenticated, getCommitsForDate]);

  // Generate all dates in the week
  const weekDates = useMemo(() => {
    const dates: string[] = [];
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    const hideWeekends = settings?.getBooleanSetting('hideWeekends') || false;
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      if (!hideWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
        dates.push(dateStr);
      }
    }
    
    return dates;
  }, [weekStart, weekEnd, settings]);

  // Group entries by taskId and date
  const taskGrid = useMemo(() => {
    const grid: Record<string, Record<string, LogEntry[]>> = {};
    
    entries.forEach(entry => {
      if (!grid[entry.taskId]) {
        grid[entry.taskId] = {};
      }
      if (!grid[entry.taskId][entry.date]) {
        grid[entry.taskId][entry.date] = [];
      }
      grid[entry.taskId][entry.date].push(entry);
    });
    
    return grid;
  }, [entries]);

  // Get unique task IDs (including empty ones for new rows)
  const taskIds = useMemo(() => {
    const ids = new Set<string>();
    
    for (const entry of entries) {
      // Always add the taskId, even if it's empty (for new rows)
      ids.add(entry.taskId);
    }
    
    // Sort with empty strings last so new rows appear at the bottom
    return Array.from(ids).sort((a, b) => {
      if (a === '' && b !== '') return 1;
      if (a !== '' && b === '') return -1;
      return a.localeCompare(b);
    });
  }, [entries, settings]);

  // Fetch JIRA headings for task IDs (filter out empty ones)
  const nonEmptyTaskIds = useMemo(() => 
    taskIds.filter(id => id.trim() !== ''), 
    [taskIds]
  );
  const { issueHeadings } = useJiraHeadings(nonEmptyTaskIds);

  // Calculate totals
  const dayTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    weekDates.forEach(date => {
      totals[date] = 0;
    });
    
    entries.forEach(entry => {
      if (totals[entry.date] !== undefined) {
        totals[entry.date] += entry.hours || 0;
      }
    });
    
    return totals;
  }, [entries, weekDates]);

  const taskTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    
    taskIds.forEach(taskId => {
      totals[taskId] = entries
        .filter(e => e.taskId === taskId)
        .reduce((sum, e) => sum + (e.hours || 0), 0);
    });
    
    return totals;
  }, [entries, taskIds]);

  const weekTotal = useMemo(() => {
    return entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  }, [entries]);

  // Handlers
  const handleAddLogEntry = (entry: { date: string; taskId: string; duration: number; description: string }) => {
    const newEntry = createEntry(entry.taskId, entry.date, entry.duration);
    addEntry(newEntry);
    setCommitsModalDate(null);
  };

  const handleAutoFillWeek = async () => {
    if (!settings) {
      setToastMsg('Settings not loaded. Please refresh the page.');
      return;
    }
    
    if (!isAuthenticated) {
      setShowGitHubAuth(true);
      return;
    }

    const taskIdRegex = settings.getSetting('taskIdRegex');
    if (!taskIdRegex || taskIdRegex.trim() === '') {
      setShowTaskIdRegexModal(true);
      return;
    }

    setIsAutoFilling(true);
    try {
      const commitSettings = {
        dayStartTime: settings.getSetting('dayStartTime') || '09:00',
        dayEndTime: settings.getSetting('dayEndTime') || '17:00',
        taskIdRegex: taskIdRegex
      };

      const result = await commitService.autoFillWeek(
        weekStart,
        handleAddLogEntry,
        commitSettings
      );

      setToastMsg(`Auto-fill completed! Processed ${result.processed} days, added ${result.added} log entries.`);
      setHasAutoFilled(true); // Mark as auto-filled for this week
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

  const handleTaskIdRegexSaved = () => {
    setShowTaskIdRegexModal(false);
    handleAutoFillWeek();
  };


  // Format week header
  const formatWeekHeader = () => {
    const startDate = new Date(weekStart);
    const endDate = new Date(weekEnd);
    const startMonth = startDate.toLocaleString('default', { month: 'short' });
    const endMonth = endDate.toLocaleString('default', { month: 'short' });
    const year = startDate.getFullYear();
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    
    const sameMonth = startMonth === endMonth;
    return sameMonth 
      ? `${startMonth} ${startDay}-${endDay}, ${year}`
      : `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  };

  // Handle sending all entries to JIRA
  const handleSendAllToJira = async () => {
    setSendingToJira(true);
    
    try {
      const entriesToSend = entries.filter(e => !e.sentToJira && (e.hours || 0) > 0);
      let successCount = 0;
      let errorCount = 0;
      
      for (const entry of entriesToSend) {
        try {
          await onSendToJira(entry);
          successCount++;
        } catch (error) {
          console.error(`Failed to send entry ${entry.id} to JIRA:`, error);
          errorCount++;
        }
      }
      
      if (errorCount === 0) {
        setToastMsg(`Successfully sent ${successCount} entries to Jira`);
      } else {
        setToastMsg(`Sent ${successCount} entries to Jira, ${errorCount} failed`);
      }
    } catch (error) {
      setToastMsg('Failed to send entries to Jira');
    } finally {
      setSendingToJira(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 overflow-hidden">
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
      
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b-2 border-gray-200">
        <div className="flex flex-row items-center justify-between w-full">
          <h3 className="text-xl font-bold text-gray-900">
            Week: {formatWeekHeader()}
          </h3>
          <div className="flex gap-3">
            <Button
              variant="primary"
              size="sm"
              className="flex items-center gap-1 text-xs"
              onClick={handleAutoFillWeek}
              disabled={isAutoFilling || hasAutoFilled}
              title={hasAutoFilled ? "Already auto-filled this week" : "Automatically fill week with GitHub commits that have task IDs"}
            >
              <span className="material-symbols-outlined text-xs">
                {isAutoFilling ? 'sync' : hasAutoFilled ? 'check_circle' : 'auto_fix_high'}
              </span>
              {isAutoFilling ? 'Auto-filling...' : hasAutoFilled ? 'Auto-filled' : 'Auto-fill Week'}
            </Button>
            <Button
              size="sm"
              className="flex items-center gap-1 text-xs"
              onClick={handleAddDailyScrum}
              disabled={eventStates['dailyScrum'] || !(settings?.getSetting('scrumTaskId') || '').trim()}
              title={!(settings?.getSetting('scrumTaskId') || '').trim() ? 'Configure Scrum Jira Task ID in settings first' : 'Add daily scrum events'}
            >
              <span className="material-symbols-outlined text-xs">event</span>
              Add daily scrum
            </Button>
            {recurringEvents.map((ev: RecurringEvent) => (
              <Button
                key={ev.id}
                variant="secondary"
                size="sm"
                className="flex items-center gap-1 text-xs"
                onClick={() => handleAddEvent(ev)}
                disabled={eventStates[ev.id] || !ev.taskId?.trim()}
                title={!ev.taskId?.trim() ? `Configure Task ID for "${ev.name}" in settings first` : `Add ${ev.name}`}
              >
                <span className="material-symbols-outlined text-xs">event</span>
                Add {ev.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <TaskGridHeader weekDates={weekDates} onViewCommits={handleViewCommits} />
          <tbody>
            
            {taskIds.map((taskId, index) => (
              <React.Fragment key={taskId}>
                <TaskGridRow
                  taskId={taskId}
                  weekDates={weekDates}
                  entries={taskGrid[taskId] || {}}
                  isEvenRow={index % 2 === 1}
                  taskTotal={taskTotals[taskId] || 0}
                  issueHeading={issueHeadings?.[taskId]}
                  onUpdateEntry={updateEntryHours}
                  onDeleteEntry={deleteEntry}
                  onAddEntry={addEntry}
                  onUpdateTaskId={updateEntryTaskId}
                />
              </React.Fragment>
            ))}
            
            {/* Add New Task Row */}
            {!entries.some(entry => entry.taskId === '') && (
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3 text-center text-gray-400 text-sm">
                  New Task
                </td>
                {weekDates.map(date => (
                  <td key={date} className="px-1 py-3 text-center border-l border-gray-200">
                    <EmptyCell
                      onClick={() => {
                        const newEntry = createEntry('', date, 0);
                        addEntry(newEntry);
                      }}
                      title={`Add task for ${date}`}
                    />
                  </td>
                ))}
                <td className="px-2 py-3 text-center border-l border-gray-200"></td>
              </tr>
            )}
            
            {/* Total row */}
            <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
              <td className="px-4 py-2 text-gray-700">Total</td>
              {weekDates.map(date => (
                <td key={date} className="px-2 py-2 text-center text-gray-700">
                  {dayTotals[date] ? `${dayTotals[date]}h` : '-'}
                </td>
              ))}
              <td className="px-2 py-2 text-center text-gray-700">
                {weekTotal}h
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <Button
          onClick={handleSendAllToJira}
          disabled={sendingToJira || entries.filter(e => !e.sentToJira && (e.hours || 0) > 0).length === 0}
          variant="primary"
          className="w-full flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">send</span>
          <span>{sendingToJira ? 'Sending to Jira...' : `Send Week to Jira (${entries.filter(e => !e.sentToJira && (e.hours || 0) > 0).length} entries)`}</span>
        </Button>
      </div>
      
      {/* Modals */}
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

      {showTaskIdRegexModal && (
        <TaskIdRegexModal
          onClose={() => setShowTaskIdRegexModal(false)}
          onSave={handleTaskIdRegexSaved}
        />
      )}
    </div>
  );
};