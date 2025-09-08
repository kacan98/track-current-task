import React, { useState } from 'react';
import { createEntry } from '@/utils/entryUtils';
import { getJiraTaskUrl } from '@/utils/jiraUtils';
import { useSettings } from '@/contexts/SettingsContext';
import { HourAdjustButtons } from '@/components/forms/HourAdjustButtons';
import { EmptyCell } from '@/components/ui/PlusButton';
import type { LogEntry } from '@/types';

interface TaskGridRowProps {
  taskId: string;
  weekDates: string[];
  entries: Record<string, LogEntry[]>;
  isEvenRow: boolean;
  taskTotal: number;
  issueHeading?: string;
  onUpdateEntry: (id: string, hours: number) => void;
  onDeleteEntry: (id: string) => void;
  onAddEntry: (entry: LogEntry) => void;
  onUpdateTaskId: (id: string, taskId: string) => void;
}

export const TaskGridRow: React.FC<TaskGridRowProps> = ({
  taskId,
  weekDates,
  entries,
  isEvenRow,
  taskTotal,
  issueHeading,
  onUpdateEntry,
  onDeleteEntry,
  onAddEntry,
  onUpdateTaskId
}) => {
  const settings = useSettings();
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState(false);
  const [taskIdValue, setTaskIdValue] = useState(taskId);

  const jiraBaseUrl = settings?.getSetting('jiraBaseUrl');
  const taskUrl = jiraBaseUrl ? getJiraTaskUrl(taskId, jiraBaseUrl) : null;

  const handleCellClick = (date: string) => {
    const cellEntries = entries[date];
    
    if (!cellEntries || cellEntries.length === 0) {
      // Empty cell - create new entry
      const newEntry = createEntry(taskId, date, 0);
      onAddEntry(newEntry);
    }
  };



  const handleDeleteEntry = (date: string) => {
    const cellEntries = entries[date];
    if (cellEntries) {
      cellEntries.forEach(entry => onDeleteEntry(entry.id));
    }
  };

  const handleHourChange = (date: string, newValue: string) => {
    const cellEntries = entries[date];
    const numValue = parseFloat(newValue) || 0;
    
    if (!cellEntries || cellEntries.length === 0) {
      // Create new entry with the specified hours
      if (numValue > 0) {
        const newEntry = createEntry(taskId, date, numValue);
        onAddEntry(newEntry);
      }
    } else {
      // Update the first entry's hours (or all entries proportionally)
      const firstEntry = cellEntries[0];
      onUpdateEntry(firstEntry.id, numValue);
    }
  };

  const handleTaskIdSave = () => {
    if (taskIdValue !== taskId) {
      // Update all entries with this task ID
      Object.values(entries).flat().forEach(entry => {
        onUpdateTaskId(entry.id, taskIdValue);
      });
    }
    setEditingTaskId(false);
  };

  const getCellContent = (date: string) => {
    const cellEntries = entries[date];
    if (!cellEntries || cellEntries.length === 0) {
      return '';
    }
    const totalHours = cellEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
    return `${totalHours}h`;
  };

  return (
    <tr className={isEvenRow ? 'bg-gray-50' : 'bg-white'}>
      <td className="px-4 py-2 text-sm font-medium text-gray-900">
        <div className="flex flex-col">
          {editingTaskId ? (
            <input
              type="text"
              value={taskIdValue}
              onChange={(e) => setTaskIdValue(e.target.value)}
              onBlur={handleTaskIdSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTaskIdSave();
                if (e.key === 'Escape') {
                  setTaskIdValue(taskId);
                  setEditingTaskId(false);
                }
              }}
              className="px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <div
              onClick={() => setEditingTaskId(true)}
              className="cursor-pointer hover:bg-gray-100 rounded"
            >
              {taskUrl ? (
                <a
                  href={taskUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {taskId}
                </a>
              ) : (
                <span className={taskId === '' ? 'text-gray-400 italic' : ''}>
                  {taskId === '' ? 'Click to set Task ID' : taskId}
                </span>
              )}
            </div>
          )}
          {issueHeading && (
            <span className="text-xs text-gray-500 mt-1">{issueHeading}</span>
          )}
        </div>
      </td>
      
      {weekDates.map(date => {
        const cellKey = `${taskId}-${date}`;
        const isHovered = hoveredCell === cellKey;
        const hasContent = entries[date] && entries[date].length > 0;
        
        return (
          <td
            key={date}
            className="relative px-1 py-2 text-center text-sm border border-gray-200 hover:bg-gray-50"
            onMouseEnter={() => setHoveredCell(cellKey)}
            onMouseLeave={() => setHoveredCell(null)}
          >
            {hasContent ? (
              <div className="flex flex-col items-center justify-center gap-1 relative min-h-[60px]">
                {isHovered ? (
                  <HourAdjustButtons
                    value={getCellContent(date).replace('h', '') || '0'}
                    onChange={(newValue) => handleHourChange(date, newValue)}
                    disabled={false}
                    onDelete={() => handleDeleteEntry(date)}
                  />
                ) : (
                  <div className="flex items-center justify-center text-sm font-medium text-gray-700">
                    {getCellContent(date)}
                  </div>
                )}
              </div>
            ) : (
              <EmptyCell
                onClick={() => handleCellClick(date)}
                title="Add entry"
              />
            )}
          </td>
        );
      })}
      
      <td className="px-4 py-2 text-center text-sm font-semibold text-gray-900">
        {taskTotal}h
      </td>
    </tr>
  );
};