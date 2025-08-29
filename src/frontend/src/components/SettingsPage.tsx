import React, { useEffect } from 'react';
import { JiraCredentialsForm } from './JiraCredentialsForm';
import { RecurringEventsEditor } from './RecurringEventsEditor';
import type { RecurringEvent } from './RecurringEventsEditor';
import { Button } from './Button';

export const SETTINGS_FIELDS = [
    { key: 'scrumTaskId', label: 'Scrum Jira Task ID', type: 'text', placeholder: 'Enter Scrum Jira Task ID' },
    { key: 'scrumDailyDurationMinutes', label: 'Daily Scrum Duration (minutes)', type: 'number', placeholder: 'Enter daily scrum duration in minutes', defaultValue: '15' },
] as const;

const initialSettings: Record<string, string> = {};
SETTINGS_FIELDS.forEach(f => {
    initialSettings[f.key] = f.defaultValue || '';
});

export type ExtractKeys<T extends readonly { key: string }[]> = T[number]['key'];
export type SettingKey = ExtractKeys<typeof SETTINGS_FIELDS>;

export type SettingsObject = {
    [K in SettingKey]: string;
};

export function getSetting(key: SettingKey): string {
    const field = SETTINGS_FIELDS.find(f => f.key === key);
    return localStorage.getItem(key) || field?.defaultValue || '';
}

function SettingsPage({ onClose, onDeleteAllRows }: { onClose: () => void, onDeleteAllRows: () => void }) {
    const [settings, setSettings] = React.useState<Record<string, string>>(initialSettings);
    const [recurringEvents, setRecurringEvents] = React.useState<RecurringEvent[]>(() => {
        const stored = localStorage.getItem('recurringEvents');
        return stored ? JSON.parse(stored) : [
            { id: 'endSprint', name: 'End Sprint Event', day: '', durationMinutes: '180' },
            { id: 'backlogRefinement', name: 'Backlog Refinement', day: '', durationMinutes: '60' },
        ];
    });

    useEffect(() => {
        const loaded: Record<string, string> = {};
        SETTINGS_FIELDS.forEach(f => {
            loaded[f.key] = localStorage.getItem(f.key) || f.defaultValue || '';
        });
        setSettings(loaded);
    }, []);

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
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    let modalContent: React.ReactNode;
    try {
        modalContent = (
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
                    <Button
                        variant="secondary"
                        className="flex items-center justify-center w-10 h-10 rounded-lg"
                        onClick={onClose}
                        aria-label="Close settings"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </Button>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <JiraCredentialsForm />
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
                    <div className="space-y-4">
                        {SETTINGS_FIELDS.map(field => (
                            <div key={field.key}>
                                <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-2">
                                    {field.label}
                                </label>
                                <input
                                    id={field.key}
                                    type={field.type}
                                    value={settings[field.key]}
                                    onChange={e => handleChange(field.key, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={field.placeholder}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recurring Events</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Name</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Day</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Duration (min)</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <RecurringEventsEditor events={recurringEvents} onChange={setRecurringEvents} />
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
                    <div className="space-y-4">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                if (window.confirm('Are you sure you want to clear all data from the browser? Your CSV file will not be affected.')) {
                                    onDeleteAllRows();
                                    onClose();
                                }
                            }}
                            className="text-red-700 border-red-200 hover:bg-red-50"
                        >
                            Clear Browser Data
                        </Button>
                        <p className="text-xs text-gray-500">
                            This will clear all data from your browser's local storage. Your original CSV file remains unchanged. You can re-upload or load from filesystem again.
                        </p>
                    </div>
                </div>
            </div>
        );
    } catch (err: any) {
        modalContent = (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-red-600 text-sm">error</span>
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

    return (
        <div className="flex items-start justify-center min-h-full p-4 pt-16">
            <div
                className="relative bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {modalContent}
            </div>
        </div>
    );
}

export default SettingsPage;