import React from 'react';
import { format } from '../utils/dateUtils';
import { LogTable } from './table/LogTable';
import type { LogEntry } from '../types';

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
  filtered,
  onSendToJira
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        {weeks.length > 1
          ? [...weeks].sort((a, b) => b.start.getTime() - a.start.getTime()).map(week => (
              <div key={week.start.toISOString()} className="mb-8 last:mb-0">
                <LogTable
                  entries={week.entries}
                  weekStart={format(week.start, 'yyyy-MM-dd')}
                  weekEnd={format(week.end, 'yyyy-MM-dd')}
                  onSendToJira={onSendToJira}
                />
              </div>
            ))
          : <LogTable
              entries={filtered}
              onSendToJira={onSendToJira}
            />
        }
      </div>
    </div>
  );
};