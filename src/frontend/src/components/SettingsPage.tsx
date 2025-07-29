import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { JiraCredentialsForm } from './JiraCredentialsForm';
import { RecurringEventsEditor } from './RecurringEventsEditor';
import type { RecurringEvent } from './RecurringEventsEditor';
import { Button } from './Button';

export const SETTINGS_FIELDS = [
  { key: 'scrumTaskId', label: 'Scrum Jira Task ID', type: 'text', placeholder: 'Enter Scrum Jira Task ID' },
  { key: 'scrumDailyDurationMinutes', label: 'Daily Scrum Duration (minutes)', type: 'number', placeholder: 'Enter daily scrum duration in minutes' },
] as const;

const initialSettings: Record<string, string> = {};
SETTINGS_FIELDS.forEach(f => {
  initialSettings[f.key] = '';
});

export type ExtractKeys<T extends readonly { key: string }[]> = T[number]['key'];
export type SettingKey = ExtractKeys<typeof SETTINGS_FIELDS>;

export type SettingsObject = {
  [K in SettingKey]: string;
};

export function getSetting(key: SettingKey): string {
  return localStorage.getItem(key) || '';
}

function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [settings, setSettings] = React.useState<Record<string, string>>(initialSettings);
  const [recurringEvents, setRecurringEvents] = React.useState<RecurringEvent[]>(() => {
    const stored = localStorage.getItem('recurringEvents');
    return stored ? JSON.parse(stored) : [
      { id: 'endSprint', name: 'End Sprint Event', day: '', durationMinutes: '180' },
      { id: 'backlogRefinement', name: 'Backlog Refinement', day: '', durationMinutes: '60' },
    ];
  });

  useEffect(() => {
    if (!open) return;
    const loaded: Record<string, string> = {};
    SETTINGS_FIELDS.forEach(f => {
      loaded[f.key] = localStorage.getItem(f.key) || '';
    });
    setSettings(loaded);
  }, [open]);

  useEffect(() => {
    localStorage.setItem('recurringEvents', JSON.stringify(recurringEvents));
  }, [recurringEvents]);

  const handleChange = (key: string, value: string) => {
    const field = SETTINGS_FIELDS.find(f => f.key === key);
    let newValue = value;
    if (field?.type === 'number' && value !== '') {
      if (key === 'scrumDailyDurationMinutes') {
        const minutes = Math.round(parseFloat(value) / 5) * 5;
        newValue = String(minutes);
      } else {
        const minutes = Math.round(parseFloat(value) / 30) * 30;
        newValue = String(minutes);
      }
    }
    localStorage.setItem(key, newValue);
    setSettings(prev => ({ ...prev, [key]: newValue }));
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  let modalContent: React.ReactNode;
  try {
    modalContent = (
      <>
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Settings</h2>
        
        <div className="mb-8">
          <JiraCredentialsForm />
        </div>
        
        <div className="flex flex-col gap-4 mb-8">
          {SETTINGS_FIELDS.map(field => (
            <div className="flex flex-col gap-2" key={field.key}>
              <label htmlFor={field.key} className="font-semibold text-gray-900">
                {field.label}
              </label>
              <input
                id={field.key}
                type={field.type}
                min={field.type === 'number' ? '0' : undefined}
                step={field.key === 'scrumDailyDurationMinutes' ? '5' : field.key.endsWith('DurationMinutes') ? '30' : undefined}
                value={settings[field.key]}
                onChange={e => handleChange(field.key, e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
        
        <div className="border-t border-gray-200 pt-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Day</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Duration (min)</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                <RecurringEventsEditor events={recurringEvents} onChange={setRecurringEvents} />
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  } catch (err: any) {
    modalContent = (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-sm">⚠</span>
          </div>
          <div>
            <h3 className="font-semibold text-red-800">Error</h3>
            <p className="text-red-700 text-sm">
              Error rendering settings: {err?.message || String(err)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return createPortal(
    <dialog 
      open 
      className="fixed inset-0 z-50 p-0 border-0 bg-transparent" 
      style={{width: '100vw', height: '100vh', background: 'none'}}
    >
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-0 cursor-pointer"
        onClick={onClose}
        aria-label="Close settings"
      />
      <div
        className="relative bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-full max-w-3xl mx-auto flex flex-col overflow-y-auto"
        style={{margin: '5vh auto', pointerEvents: 'auto', maxHeight: '90vh'}}
        onClick={e => e.stopPropagation()}
      >
        <Button
          variant="secondary"
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-lg"
          onClick={onClose}
          aria-label="Close settings"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </Button>
        {modalContent}
      </div>
    </dialog>,
    document.body
  );
}

export default SettingsModal;