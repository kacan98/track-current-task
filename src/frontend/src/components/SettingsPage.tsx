import React, { useState } from 'react';
import { JiraCredentialsForm } from './JiraCredentialsForm';
import { Button } from './Button';
import { RecurringEventsEditor } from './RecurringEventsEditor';
import type { RecurringEvent } from './RecurringEventsEditor';

export const SETTINGS_FIELDS = [
  { key: 'scrumTaskId', label: 'Scrum Jira Task ID', type: 'text', placeholder: 'Enter Scrum Jira Task ID' },
  { key: 'scrumDailyDurationMinutes', label: 'Daily Scrum Duration (minutes)', type: 'number', placeholder: 'Enter daily scrum duration in minutes' },
] as const;

const initialSettings: Record<string, string> = {};
SETTINGS_FIELDS.forEach(f => {
  initialSettings[f.key] = '';
});

function SettingsPage({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings);
  const [recurringEvents, setRecurringEvents] = useState<RecurringEvent[]>(() => {
    const stored = localStorage.getItem('recurringEvents');
    return stored ? JSON.parse(stored) : [
      { id: 'endSprint', name: 'End Sprint Event', day: '', durationMinutes: '180' },
      { id: 'backlogRefinement', name: 'Backlog Refinement', day: '', durationMinutes: '60' },
    ];
  });

  // Load initial values from localStorage
  React.useEffect(() => {
    const loaded: Record<string, string> = {};
    SETTINGS_FIELDS.forEach(f => {
      loaded[f.key] = localStorage.getItem(f.key) || '';
    });
    setSettings(loaded);
  }, []);

  // Save values to localStorage on change
  const handleChange = (key: string, value: string) => {
    const field = SETTINGS_FIELDS.find(f => f.key === key);
    let newValue = value;
    if (field?.type === 'number' && value !== '') {
      if (key === 'scrumDailyDurationMinutes') {
        // For daily, round to nearest 5 min
        const minutes = Math.round(parseFloat(value) / 5) * 5;
        newValue = String(minutes);
      } else {
        // For others, round to nearest 30 min
        const minutes = Math.round(parseFloat(value) / 30) * 30;
        newValue = String(minutes);
      }
    }
    localStorage.setItem(key, newValue);
    setSettings(prev => ({ ...prev, [key]: newValue }));
  };

  // Set default values for daily and event durations
  React.useEffect(() => {
    if (!localStorage.getItem('scrumDailyDurationMinutes')) {
      localStorage.setItem('scrumDailyDurationMinutes', '15');
    }
    if (!localStorage.getItem('scrumEndSprintDurationMinutes')) {
      localStorage.setItem('scrumEndSprintDurationMinutes', '180');
    }
    if (!localStorage.getItem('backlogRefinementDurationMinutes')) {
      localStorage.setItem('backlogRefinementDurationMinutes', '60');
    }
  }, []);

  // Save recurring events to localStorage on change
  React.useEffect(() => {
    localStorage.setItem('recurringEvents', JSON.stringify(recurringEvents));
  }, [recurringEvents]);

  return (
    <div className="fixed inset-0 min-h-screen w-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-center z-50 overflow-x-hidden">
      <div className="relative max-w-screen-md bg-white/80 rounded-2xl shadow-xl border border-blue-100 p-6 z-10 flex flex-col gap-6 max-h-[90vh] overflow-auto overflow-x-hidden">
        <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Settings</h2>
        <JiraCredentialsForm />
        {/* Settings fields */}
        {SETTINGS_FIELDS.map(field => (
          <div className="flex flex-col gap-2" key={field.key}>
            <label htmlFor={field.key} className="font-semibold text-blue-600">{field.label}</label>
            <input
              id={field.key}
              type={field.type}
              min={field.type === 'number' ? '0' : undefined}
              step={field.key === 'scrumDailyDurationMinutes' ? '5' : field.key.endsWith('DurationMinutes') ? '30' : undefined}
              value={settings[field.key]}
              onChange={e => handleChange(field.key, e.target.value)}
              className="border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
              placeholder={field.placeholder}
            />
          </div>
        ))}
        {/* Recurring events table - sleeker layout */}
        <div className="flex flex-col gap-4 border-t pt-4 mt-4">
          <table className="min-w-full text-sm text-center w-auto border rounded shadow">
            <thead>
              <tr className="bg-blue-100">
                <th className="px-3 py-2 rounded-tl-2xl">Name</th>
                <th className="px-3 py-2">Day</th>
                <th className="px-3 py-2">Duration (min)</th>
                <th className="px-3 py-2 rounded-tr-2xl">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white/80">
              <RecurringEventsEditor events={recurringEvents} onChange={setRecurringEvents} />
            </tbody>
          </table>
        </div>
        <Button
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </div>
  );
}

type ExtractKeys<T extends readonly { key: string }[]> = T[number]['key'];
export type SettingKey = ExtractKeys<typeof SETTINGS_FIELDS>;

export type SettingsObject = {
  [K in SettingKey]: string;
};

export function getSetting(key: SettingKey): string {
  return localStorage.getItem(key) || '';
}

export default SettingsPage;
