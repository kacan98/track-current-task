// components/LogTable/DayGroupHeader.tsx
import { getDayOfWeek } from '../utils';

interface DayGroupHeaderProps {
  date: string;
  totalHours: number;
  entryCount: number;
}

export function DayGroupHeader({ date, totalHours, entryCount }: DayGroupHeaderProps) {
  return (
    <tr className="bg-gray-100 border-t-2 border-gray-300">
      <td colSpan={7} className="px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-800">
              {date} ({getDayOfWeek(date)})
            </span>
            <span className="text-sm text-gray-600">
              {entryCount} {entryCount === 1 ? 'task' : 'tasks'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Total:</span>
            <span className="font-semibold text-lg text-gray-800 bg-white px-2 py-1 rounded border">
              {totalHours.toFixed(1)}h
            </span>
          </div>
        </div>
      </td>
    </tr>
  );
}