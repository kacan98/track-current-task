// components/LogTable/LogTableRow.tsx - Updated to support day grouping
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { HourAdjustButtons } from '@/components/forms/HourAdjustButtons';
import { getJiraTaskUrl } from '@/utils/jiraUtils';
import type { LogEntry } from '@/types';
import { JiraHeadingCell, type JiraHeadingCellProps } from './JiraHeadingCell';
import type { JiraWorklogCellProps } from './JiraWorklogCell';
import { useLogEntries } from '@/contexts/LogEntriesContext';
import { jiraHeadingsCache } from '@/utils/cache';

export type LogTableRowProps = {
  entry: LogEntry;
  taskColorMap: Record<string, string>;
  loadingHeadings: JiraHeadingCellProps['loadingHeadings'];
  headingsError: JiraHeadingCellProps['headingsError'];
  issueHeadings: JiraHeadingCellProps['issueHeadings'];
  loadingWorklogs: JiraWorklogCellProps['loadingWorklogs'];
  worklogError: JiraWorklogCellProps['worklogError'];
  worklogTotals: JiraWorklogCellProps['worklogTotals'];
  handleDeleteEntry: (id: string) => void;
  handleSendToJira?: (entry: LogEntry) => void;
  handleCloneEntry: (id: string) => void;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  isDragOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
};

export function LogTableRow({
  entry,
  taskColorMap: dfoTaskColorMap,
  loadingHeadings,
  headingsError,
  issueHeadings,
  handleDeleteEntry,
  handleSendToJira,
  handleCloneEntry,
  isFirstInGroup = false,
  isLastInGroup = false,
  isDragOver = false,
  onDragOver,
  onDrop,
  onDragEnd,
}: LogTableRowProps) {
  const { updateEntryHours, updateEntryTaskId } = useLogEntries();
  const [isEditing, setIsEditing] = useState(false);
  const [editTaskId, setEditTaskId] = useState(entry.taskId);
  
  const handleStartEdit = () => {
    setIsEditing(true);
    setEditTaskId(entry.taskId);
  };
  
  const handleSaveEdit = () => {
    const newTaskId = editTaskId.trim();
    if (newTaskId !== entry.taskId) {
      // Clear cache for both old and new task IDs to force refetch
      if (entry.taskId && /^DFO-\d+$/.test(entry.taskId)) {
        jiraHeadingsCache.delete(entry.taskId);
      }
      if (newTaskId && /^DFO-\d+$/.test(newTaskId)) {
        jiraHeadingsCache.delete(newTaskId);
      }
      updateEntryTaskId(entry.id, newTaskId);
    }
    setIsEditing(false);
  };
  
  const handleCancelEdit = () => {
    setEditTaskId(entry.taskId);
    setIsEditing(false);
  };
  
  // Auto-edit if taskId is empty (new entry)
  React.useEffect(() => {
    if (entry.taskId === '') {
      setIsEditing(true);
    }
  }, [entry.taskId]);
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('entryId', entry.id);
    e.dataTransfer.setData('entryData', JSON.stringify(entry));
    // Add visual feedback to the whole row
    const row = e.currentTarget.closest('tr');
    if (row) row.classList.add('opacity-50');
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    // Remove visual feedback from the row
    const row = e.currentTarget.closest('tr');
    if (row) row.classList.remove('opacity-50');
    // Call parent's drag end to clear any highlights
    if (onDragEnd) onDragEnd();
  };
  const url = getJiraTaskUrl(entry.taskId);
  const taskCellClass = /^DFO-\d+$/.test(entry.taskId)
    ? dfoTaskColorMap[entry.taskId] + ' font-mono rounded px-2 py-1'
    : 'text-gray-500';

  // Add subtle grouping styling
  const rowClass = `
    border-t border-gray-200 hover:bg-gray-50 transition-colors
    ${isFirstInGroup ? 'border-l-4 border-l-blue-300' : 'border-l-4 border-l-gray-100'}
    ${isLastInGroup ? 'border-b-2 border-b-gray-300' : ''}
    ${isDragOver ? 'bg-blue-50' : ''}
  `;

  return (
    <tr 
      className={rowClass}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <td className="px-2 py-2 text-center w-8">
        {!entry.sentToJira && (
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="cursor-move inline-block p-1 hover:bg-gray-200 rounded"
            title="Drag to move to another day"
          >
            <span className="material-symbols-outlined text-gray-400 hover:text-gray-600" style={{ fontSize: '20px' }}>
              drag_indicator
            </span>
          </div>
        )}
      </td>
      <td className={`px-3 py-2 whitespace-nowrap text-center ${taskCellClass}`}>
        <div className="flex items-center justify-center gap-1">
          {isEditing ? (
            <>
              <input
                type="text"
                value={editTaskId}
                onChange={(e) => setEditTaskId(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm w-24 text-center"
                placeholder="Task ID"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <Button
                variant="secondary"
                className="p-1"
                onClick={handleSaveEdit}
                title="Save"
              >
                <span className="material-symbols-outlined text-sm text-green-600">check</span>
              </Button>
              <Button
                variant="secondary"
                className="p-1"
                onClick={handleCancelEdit}
                title="Cancel"
              >
                <span className="material-symbols-outlined text-sm text-red-600">close</span>
              </Button>
            </>
          ) : (
            <>
              <span>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                    {entry.taskId || '(empty)'}
                  </a>
                ) : (
                  entry.taskId || '(empty)'
                )}
              </span>
              {!entry.sentToJira && (
                <Button
                  variant="secondary"
                  className="p-0.5 ml-1"
                  onClick={handleStartEdit}
                  title="Edit task ID"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                </Button>
              )}
            </>
          )}
        </div>
      </td>
      <td className="hidden sm:table-cell px-3 py-2 text-center">
        <JiraHeadingCell
          entry={entry}
          loadingHeadings={loadingHeadings}
          headingsError={headingsError}
          issueHeadings={issueHeadings}
        />
      </td>
      <td className="px-3 py-2 text-center">
        <HourAdjustButtons
          value={entry.hours}
          onChange={v => updateEntryHours(entry.id, +v)}
          disabled={entry.sentToJira}
        />
      </td>
      <td className="px-2 sm:px-3 py-2 text-center">
        <div className="flex justify-center items-center gap-1 sm:gap-2">
          {handleSendToJira && (
            <Button
              variant={entry.sentToJira ? "secondary" : "primary"}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
              disabled={entry.sentToJira}
              onClick={() => handleSendToJira(entry)}
              aria-label={entry.sentToJira ? 'Already sent to Jira' : 'Send to Jira'}
            >
              <span className="material-symbols-outlined text-sm">
                {entry.sentToJira ? 'check_circle' : 'send'}
              </span>
              <span className="hidden sm:inline">{entry.sentToJira ? 'Sent' : 'Send'}</span>
            </Button>
          )}
          <Button
            variant="secondary"
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
            onClick={() => handleCloneEntry(entry.id)}
            aria-label="Clone entry"
          >
            <span className="material-symbols-outlined text-sm">content_copy</span>
            <span className="hidden sm:inline">Clone</span>
          </Button>
          <Button
            variant="secondary"
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={entry.sentToJira}
            onClick={() => handleDeleteEntry(entry.id)}
            aria-label="Delete entry"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </td>
    </tr>
  );
}