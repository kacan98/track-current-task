import { Button } from '@/components/ui/Button';
import type { RecurringEvent } from '@/components/RecurringEventsEditor';
import type { LogEntry } from '@/types';

function getRecurringEvents(): RecurringEvent[] {
  const stored = localStorage.getItem('recurringEvents');
  return stored ? JSON.parse(stored) : [];
}

export function WeekHeader({ 
  weekStart, 
  weekEnd, 
  onAddDailyScrum, 
  onAddEvent, 
  eventStates,
  hasScrumTaskId,
  onAutoFillWeek,
  isAutoFilling,
  hasAutoFilled,
  onSendToJira,
  sendingToJira,
  entries,
}: {
  weekStart: string;
  weekEnd: string;
  onAddDailyScrum: () => void;
  onAddEvent: (event: RecurringEvent) => void;
  eventStates: Record<string, boolean>;
  hasScrumTaskId: boolean;
  onAutoFillWeek: () => void | Promise<void>;
  isAutoFilling?: boolean;
  hasAutoFilled?: boolean;
  onSendToJira?: (() => void | Promise<void>) | undefined;
  sendingToJira?: boolean;
  entries?: LogEntry[];
}) {
  const recurringEvents = getRecurringEvents();
  
  // Format week header
  const startDate = new Date(weekStart);
  const endDate = new Date(weekEnd);
  const startMonth = startDate.toLocaleString('default', { month: 'short' });
  const endMonth = endDate.toLocaleString('default', { month: 'short' });
  const year = startDate.getFullYear();
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  
  // Format: "Sep 1-7, 2025" or "Aug 28 - Sep 3, 2025" if crossing months
  const sameMonth = startMonth === endMonth;
  const dateRange = sameMonth 
    ? `${startMonth} ${startDay}-${endDay}, ${year}`
    : `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  
  return (
    <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
      <td colSpan={7} className="px-6 py-4 text-left align-middle">
        <div className="flex flex-row items-center justify-between w-full">
          <div className="flex flex-col">
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              {dateRange}
            </span>
          </div>
          <div className="flex gap-3">
            <Button
              variant="primary"
              size="sm"
              className="flex items-center gap-1 text-xs"
              onClick={onAutoFillWeek}
              disabled={isAutoFilling || hasAutoFilled}
              title={hasAutoFilled ? "Already auto-filled this week" : "Automatically fill week with GitHub commits that have task IDs"}
            >
              <span className="material-symbols-outlined text-xs">
                {isAutoFilling ? 'sync' : hasAutoFilled ? 'check_circle' : 'auto_fix_high'}
              </span>
              {isAutoFilling ? 'Auto-filling...' : hasAutoFilled ? 'Auto-filled' : 'Auto-fill Week'}
            </Button>
            <Button
              size="sm"
              className="flex items-center gap-1 text-xs"
              onClick={onAddDailyScrum}
              disabled={eventStates['dailyScrum'] || !hasScrumTaskId}
              title={!hasScrumTaskId ? 'Configure Scrum Jira Task ID in settings first' : 'Add daily scrum events'}
            >
              <span className="material-symbols-outlined text-xs">event</span>
              Add daily scrum
            </Button>
            {recurringEvents.map((ev: RecurringEvent) => (
              <Button
                key={ev.id}
                variant="secondary"
                size="sm"
                className="flex items-center gap-1 text-xs"
                onClick={() => onAddEvent(ev)}
                disabled={eventStates[ev.id] || !ev.taskId?.trim()}
                title={!ev.taskId?.trim() ? `Configure Task ID for "${ev.name}" in settings first` : `Add ${ev.name}`}
              >
                <span className="material-symbols-outlined text-xs">event</span>
                Add {ev.name}
              </Button>
            ))}
            {onSendToJira && entries && (
              <Button
                variant="primary"
                size="sm"
                className="flex items-center gap-1 text-xs"
                onClick={onSendToJira}
                disabled={sendingToJira || entries.filter((e: LogEntry) => !e.sentToJira).length === 0}
                title={sendingToJira ? 'Sending entries to Jira...' : `Send ${entries.filter((e: LogEntry) => !e.sentToJira).length} entries to Jira`}
              >
                <span className="material-symbols-outlined text-xs">
                  {sendingToJira ? 'sync' : 'send'}
                </span>
                {sendingToJira ? 'Sending...' : `Send to Jira (${entries.filter((e: LogEntry) => !e.sentToJira).length})`}
              </Button>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
