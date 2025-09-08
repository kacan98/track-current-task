import React from 'react';
import { LogTable } from './LogTable';
import { format } from '@/utils/dateUtils';
import type { LogEntry } from '@/types';

interface WeekData {
  start: Date;
  end: Date;
  entries: LogEntry[];
}

interface WeeklyLogDisplayProps {
  weeks: WeekData[];
  filtered: LogEntry[];
  onSendToJira: (entry: LogEntry) => void;
}

export const WeeklyLogDisplay: React.FC<WeeklyLogDisplayProps> = ({
  weeks,
  filtered: _filtered,
  onSendToJira
}) => {
  return (
    <div className="space-y-8">
      {[...weeks].sort((a, b) => b.start.getTime() - a.start.getTime()).map(week => {
        const weekStartStr = format(week.start, 'yyyy-MM-dd');
        const weekEndStr = format(week.end, 'yyyy-MM-dd');
        return (
          <div key={week.start.toISOString()} className="bg-white rounded-xl shadow-md border border-gray-200">
            <LogTable
              entries={week.entries}
              weekStart={weekStartStr}
              weekEnd={weekEndStr}
              onSendToJira={onSendToJira}
            />
          </div>
        );
      })}
    </div>
  );
};