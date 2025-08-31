import React from 'react';
import { LogTable } from './LogTable';
import { format } from '../../utils/dateUtils';
import type { LogEntry } from '../../types';

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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        {[...weeks].sort((a, b) => b.start.getTime() - a.start.getTime()).map(week => {
          const weekStartStr = format(week.start, 'yyyy-MM-dd');
          const weekEndStr = format(week.end, 'yyyy-MM-dd');
          return (
            <div key={week.start.toISOString()} className={weeks.length > 1 ? "mb-8 last:mb-0" : ""}>
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
    </div>
  );
};