import { Button } from '../Button';
import type { RecurringEvent } from '../RecurringEventsEditor';

function getRecurringEvents(): RecurringEvent[] {
  const stored = localStorage.getItem('recurringEvents');
  return stored ? JSON.parse(stored) : [];
}

export function WeekHeader({ 
  weekStart, 
  weekEnd, 
  onAddDailyScrum, 
  onAddEvent, 
  eventStates 
}: {
  weekStart: string;
  weekEnd: string;
  onAddDailyScrum: () => void;
  onAddEvent: (event: RecurringEvent) => void;
  eventStates: Record<string, boolean>;
}) {
  const recurringEvents = getRecurringEvents();
  
  // Format week header: 'Month YYYY: dd – dd'
  const startDate = new Date(weekStart);
  const endDate = new Date(weekEnd);
  const month = startDate.toLocaleString('default', { month: 'long' });
  const year = startDate.getFullYear();
  const startDay = String(startDate.getDate()).padStart(2, '0');
  const endDay = String(endDate.getDate()).padStart(2, '0');
  
  return (
    <tr className="bg-gray-50 border-b border-gray-200">
      <td colSpan={7} className="px-6 py-3 text-left align-middle">
        <div className="flex flex-row items-center justify-between w-full">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900 tracking-tight">
              {month} {year}: {startDay} – {endDay}
            </span>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex items-center gap-2"
              onClick={onAddDailyScrum}
              disabled={eventStates['dailyScrum']}
            >
              Add daily scrum events
            </Button>
            {recurringEvents.map((ev: RecurringEvent) => (
              <Button
                key={ev.id}
                variant="secondary"
                className="flex items-center gap-2"
                onClick={() => onAddEvent(ev)}
                disabled={eventStates[ev.id]}
              >
                Add {ev.name}
              </Button>
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
}
