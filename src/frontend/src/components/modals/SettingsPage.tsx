import React, { useEffect } from 'react';
import { JiraCredentialsForm } from '../forms/JiraCredentialsForm';
import { RecurringEventsEditor } from '../RecurringEventsEditor';
import type { RecurringEvent } from '../RecurringEventsEditor';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export const SETTINGS_FIELDS = [
    { key: 'scrumTaskId', label: 'Scrum Jira Task ID', type: 'text', placeholder: 'Enter Scrum Jira Task ID' } as const,
    { key: 'scrumDailyDurationMinutes', label: 'Daily Scrum Duration (minutes)', type: 'number', placeholder: 'Enter daily scrum duration in minutes', defaultValue: '15' } as const,
    { key: 'hideWeekends', label: 'Hide Weekends', type: 'checkbox', defaultValue: 'true' } as const,
    { key: 'githubUsername', label: 'GitHub Username', type: 'text', placeholder: 'Enter your GitHub username' } as const,
    { key: 'githubToken', label: 'GitHub Personal Access Token', type: 'password', placeholder: 'Enter your GitHub PAT' } as const,
] as const;

const initialSettings: Record<string, string> = {};
SETTINGS_FIELDS.forEach(f => {
    initialSettings[f.key] = 'defaultValue' in f ? f.defaultValue : '';
});

export type ExtractKeys<T extends readonly { key: string }[]> = T[number]['key'];
export type SettingKey = ExtractKeys<typeof SETTINGS_FIELDS>;

export type SettingsObject = {
    [K in SettingKey]: string;
};

export function getSetting(key: SettingKey): string {
    const field = SETTINGS_FIELDS.find(f => f.key === key);
    return localStorage.getItem(key) || (field && 'defaultValue' in field ? field.defaultValue : '') || '';
}

export function getBooleanSetting(key: SettingKey): boolean {
    return getSetting(key) === 'true';
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
            loaded[f.key] = localStorage.getItem(f.key) || ('defaultValue' in f ? f.defaultValue : '');
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


    return (
        <Modal title="Settings" onClose={onClose} maxWidth="4xl">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <JiraCredentialsForm />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
                <div className="space-y-4">
                    {SETTINGS_FIELDS.filter(f => !f.key.startsWith('github')).map(field => (
                        <div key={field.key}>
                            {field.type === 'checkbox' ? (
                                <label htmlFor={field.key} className="flex items-center cursor-pointer">
                                    <input
                                        id={field.key}
                                        type="checkbox"
                                        checked={settings[field.key] === 'true'}
                                        onChange={e => handleChange(field.key, e.target.checked ? 'true' : 'false')}
                                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        {field.label}
                                    </span>
                                </label>
                            ) : (
                                <>
                                    <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-2">
                                        {field.label}
                                    </label>
                                    <input
                                        id={field.key}
                                        type={field.type}
                                        value={settings[field.key]}
                                        onChange={e => handleChange(field.key, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder={'placeholder' in field ? field.placeholder : undefined}
                                    />
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">GitHub Integration</h3>
                <div className="space-y-4">
                    {SETTINGS_FIELDS.filter(f => f.key.startsWith('github')).map(field => (
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
                                placeholder={'placeholder' in field ? field.placeholder : undefined}
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
        </Modal>
    );
}

export default SettingsPage;