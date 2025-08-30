// components/LogTable/DayGroupHeader.tsx
import { getDayOfWeek } from '@/utils/componentUtils';
import { Button } from '../../ui/Button';

interface DayGroupHeaderProps {
  date: string;
  totalHours: number;
  entryCount: number;
  isDragOver: boolean;
  onAddTask?: (date: string) => void;
  onViewCommits?: (date: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export function DayGroupHeader({ date, totalHours, entryCount, isDragOver, onAddTask, onViewCommits, onDragOver, onDrop }: DayGroupHeaderProps) {

  return (
    <tr 
      className={`border-t-2 border-gray-300 transition-all ${
        isDragOver ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-gray-100'
      }`}
      onDragOver={onDragOver}
      onDrop={onDrop}>
      <td colSpan={6} className="px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-800">
              {date} ({getDayOfWeek(date)})
            </span>
            <span className="text-sm text-gray-600">
              {entryCount} {entryCount === 1 ? 'task' : 'tasks'}
            </span>
            {isDragOver && (
              <span className="text-sm font-medium text-blue-600 animate-pulse ml-4">
                ➜ Drop here to move to {date}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Total:</span>
            <span className="font-semibold text-lg text-gray-800 bg-white px-2 py-1 rounded border">
              {totalHours.toFixed(1)}h
            </span>
            <div className="flex items-center gap-2">
              {onViewCommits && (
                <Button
                  variant="secondary"
                  className="flex items-center gap-1 text-xs px-2 py-1"
                  onClick={() => onViewCommits(date)}
                  title={`View GitHub commits for ${date}`}
                >
                  <span className="material-symbols-outlined text-sm">code</span>
                  <span>Commits</span>
                </Button>
              )}
              {onAddTask && (
                <Button
                  variant="secondary"
                  className="flex items-center gap-1 text-xs px-2 py-1"
                  onClick={() => onAddTask(date)}
                  title={`Add new task for ${date}`}
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Add Task</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}