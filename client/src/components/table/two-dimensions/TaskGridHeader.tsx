import React from 'react';
import { Button } from '@/components/ui/Button';

interface TaskGridHeaderProps {
  weekDates: string[];
  onViewCommits?: (date: string) => void;
}

export const TaskGridHeader: React.FC<TaskGridHeaderProps> = ({ weekDates, onViewCommits }) => {
  const formatDayHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = date.getDate();
    return (
      <div className="flex items-center justify-center gap-2">
        <div className="flex flex-col items-center">
          <span className="font-semibold">{dayName}</span>
          <span className="text-xs text-gray-500">{dayNum}</span>
        </div>
        {onViewCommits && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onViewCommits(dateStr)}
            className="w-7 h-7 p-0 flex items-center justify-center"
            title={`View GitHub commits for ${dateStr}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
          </Button>
        )}
      </div>
    );
  };

  return (
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64 min-w-64">
          Task ID
        </th>
        {weekDates.map(date => (
          <th key={date} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
            {formatDayHeader(date)}
          </th>
        ))}
        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
          Total
        </th>
      </tr>
    </thead>
  );
};