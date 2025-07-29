import React from 'react';
import { Button } from './Button';

export type RecurringEvent = {
  id: string;
  name: string;
  day: string;
  durationMinutes: string;
};

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface RecurringEventsEditorProps {
  events: RecurringEvent[];
  onChange: (events: RecurringEvent[]) => void;
}

export const RecurringEventsEditor: React.FC<RecurringEventsEditorProps> = ({ events, onChange }) => {
  const handleFieldChange = (id: string, field: keyof RecurringEvent, value: string) => {
    onChange(events.map(ev => ev.id === id ? { ...ev, [field]: value } : ev));
  };

  const handleRemove = (id: string) => {
    onChange(events.filter(ev => ev.id !== id));
  };

  const handleAdd = () => {
    const newEvent: RecurringEvent = {
      id: Math.random().toString(36).slice(2),
      name: '',
      day: '',
      durationMinutes: '30',
    };
    onChange([...events, newEvent]);
  };

  return (
    <>
      {events.map(ev => (
        <tr key={ev.id} className="transition hover:bg-background-light">
          <td className="px-4 py-3">
            <input
              type="text"
              value={ev.name}
              onChange={e => handleFieldChange(ev.id, 'name', e.target.value)}
              placeholder="Event name (e.g. Backlog Refinement)"
              className="border border-background-dark rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-light bg-white/90"
            />
          </td>
          <td className="px-4 py-3">
            <select
              value={ev.day}
              onChange={e => handleFieldChange(ev.id, 'day', e.target.value)}
              className="border border-background-dark rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-light bg-white/90"
            >
              <option value="">Select a day</option>
              {DAYS.slice(1).map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </td>
          <td className="px-4 py-3">
            <input
              type="number"
              min="0"
              step="30"
              value={ev.durationMinutes}
              onChange={e => handleFieldChange(ev.id, 'durationMinutes', e.target.value)}
              placeholder="Duration (min)"
              className="border border-background-dark rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-light bg-white/90"
            />
          </td>
          <td className="px-4 py-3 text-center">
            <Button
              type="button"
              variant="secondary"
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg border border-background-dark hover:bg-background focus:bg-background-light"
              onClick={() => handleRemove(ev.id)}
              title="Remove event"
            >
              <span className="material-symbols-outlined text-base align-middle">delete</span>
              Remove
            </Button>
          </td>
        </tr>
      ))}
      <tr>
        <td colSpan={4} className="px-4 py-3 text-left">
          <Button
            type="button"
            variant="secondary"
            className="px-4 py-2 rounded-lg font-semibold border border-background-dark hover:bg-background focus:bg-background-light"
            onClick={handleAdd}
          >
            + Add Event
          </Button>
        </td>
      </tr>
    </>
  );
};
