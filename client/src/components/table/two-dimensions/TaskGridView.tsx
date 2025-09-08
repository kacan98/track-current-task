import React from 'react';
import { TaskGridWeek } from './TaskGridWeek';
import { format } from '@/utils/dateUtils';
import type { LogEntry } from '@/types';

interface WeekData {
  start: Date;
  end: Date;
  entries: LogEntry[];
}

interface TaskGridViewProps {
  weeks: WeekData[];
  filtered: LogEntry[];
  onSendToJira: (entry: LogEntry) => void;
}

export const TaskGridView: React.FC<TaskGridViewProps> = ({
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
          <TaskGridWeek
            key={week.start.toISOString()}
            entries={week.entries}
            weekStart={weekStartStr}
            weekEnd={weekEndStr}
            onSendToJira={onSendToJira}
          />
        );
      })}
    </div>
  );
};