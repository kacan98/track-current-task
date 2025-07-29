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
        <tr key={ev.id} className="transition hover:bg-blue-50">
          <td className="px-3 py-2">
            <input
              type="text"
              value={ev.name}
              onChange={e => handleFieldChange(ev.id, 'name', e.target.value)}
              placeholder="Event name (e.g. Backlog Refinement)"
              className="border rounded px-3 py-2 w-full focus:outline-none focus:ring focus:border-blue-300 bg-white/80"
            />
          </td>
          <td className="px-3 py-2">
            <select
              value={ev.day}
              onChange={e => handleFieldChange(ev.id, 'day', e.target.value)}
              className="border rounded px-3 py-2 w-full focus:outline-none focus:ring focus:border-blue-300 bg-white/80"
            >
              <option value="">Select a day</option>
              {DAYS.slice(1).map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </td>
          <td className="px-3 py-2">
            <input
              type="number"
              min="0"
              step="30"
              value={ev.durationMinutes}
              onChange={e => handleFieldChange(ev.id, 'durationMinutes', e.target.value)}
              placeholder="Duration (min)"
              className="border rounded px-3 py-2 w-full focus:outline-none focus:ring focus:border-blue-300 bg-white/80"
            />
          </td>
          <td className="px-3 py-2 text-center">
            <Button
              type="button"
              onClick={() => handleRemove(ev.id)}
              className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold text-red-600 bg-red-50 rounded hover:bg-red-100 transition"
              title="Remove event"
            >
              <span className="material-symbols-outlined text-base align-middle">delete</span>
              Remove
            </Button>
          </td>
        </tr>
      ))}
      <tr>
        <td colSpan={4} className="px-3 py-2 text-left">
          <Button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-semibold shadow transition"
          >
            + Add Event
          </Button>
        </td>
      </tr>
    </>
  );
};
