// components/LogTable/DayGroupHeader.tsx
import { getDayOfWeek } from '@/utils/componentUtils';
import { Button } from '@/components/ui/Button';

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
  const isEmpty = entryCount === 0;

  return (
    <tr 
      className={`border-t-2 transition-all ${
        isDragOver ? 'bg-blue-100 ring-2 ring-blue-400 border-blue-300' : 
        isEmpty ? 'bg-amber-50 border-amber-200' : 'bg-gray-100 border-gray-300'
      }`}
      onDragOver={onDragOver}
      onDrop={onDrop}>
      {/* Date spans drag + task columns */}
      <td colSpan={2} className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800">
            {date} ({getDayOfWeek(date)})
          </span>
          {isEmpty ? (
            <span className="text-sm text-amber-700 font-medium">
              📅 No entries
            </span>
          ) : (
            <span className="text-sm text-gray-600">
              {entryCount} {entryCount === 1 ? 'task' : 'tasks'}
            </span>
          )}
          {isDragOver && (
            <span className="text-sm font-medium text-blue-600 animate-pulse ml-2">
              ➜ Drop here
            </span>
          )}
        </div>
      </td>
      
      {/* Repository column (hidden on mobile) */}
      <td className="hidden sm:table-cell"></td>
      
      {/* Heading column (hidden on mobile) */}
      <td className="hidden sm:table-cell"></td>
      
      {/* Hours column - contains the total, spans full width */}
      <td className="px-3 py-2">
        <div className={`w-full text-center font-semibold text-lg px-2 py-1 rounded border ${
          isEmpty ? 'text-amber-600 bg-amber-100 border-amber-300' : 'text-gray-800 bg-white'
        }`}>
          {totalHours.toFixed(1)}h
        </div>
      </td>
      
      {/* Action column - contains buttons spanning full width */}
      <td className="px-2 sm:px-3 py-2">
        <div className="flex items-center justify-center gap-1 w-full">
          {onViewCommits && (
            <Button
              variant="secondary"
              size="sm"
              className="flex items-center justify-center w-8 h-8 p-0"
              onClick={() => onViewCommits(date)}
              title={`View GitHub commits for ${date}`}
            >
              <span className="material-symbols-outlined text-sm">code</span>
            </Button>
          )}
          {onAddTask && (
            <Button
              variant="secondary"
              size="sm"
              className="flex items-center justify-center w-8 h-8 p-0"
              onClick={() => onAddTask(date)}
              title={`Add new task for ${date}`}
            >
              <span className="material-symbols-outlined text-sm">add</span>
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}