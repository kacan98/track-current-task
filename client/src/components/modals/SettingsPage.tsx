import React, { useEffect } from 'react';
import { JiraCredentialsForm } from '../forms/JiraCredentialsForm';
import { GitHubConnectionForm } from '../forms/GitHubConnectionForm';
import { RecurringEventsEditor } from '../RecurringEventsEditor';
import type { RecurringEvent } from '../RecurringEventsEditor';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useSettings } from '../../contexts/SettingsContext';
import { useIntroduction } from '../../contexts/IntroductionContext';
import { CommitAnalysisSettings } from './CommitsModal/components/CommitAnalysisSettings';
import { useCommitValidation } from './CommitsModal/hooks/useCommitValidation';

export const SETTINGS_FIELDS = [
    { key: 'scrumTaskId', label: 'Scrum Jira Task ID', type: 'text', placeholder: 'Enter Scrum Jira Task ID' } as const,
    { key: 'scrumDailyDurationMinutes', label: 'Daily Scrum Duration (minutes)', type: 'number', placeholder: 'Enter daily scrum duration in minutes', defaultValue: '15' } as const,
    { key: 'hideWeekends', label: 'Hide Weekends', type: 'checkbox', defaultValue: 'true' } as const,
    { key: 'weekStartDay', label: 'Week Start Day', type: 'select', options: [{ value: '0', label: 'Sunday' }, { value: '1', label: 'Monday' }], defaultValue: '1' } as const,
    { key: 'githubUsername', label: 'GitHub Username', type: 'text', placeholder: 'Enter your GitHub username' } as const,
    { key: 'dayStartTime', label: 'Day Start Time', type: 'time', defaultValue: '09:00' } as const,
    { key: 'dayEndTime', label: 'Day End Time', type: 'time', defaultValue: '17:00' } as const,
    { key: 'taskIdRegex', label: 'Task ID Regex Pattern', type: 'text', placeholder: 'e.g., PROJ-\\d+' } as const,
    { key: 'jiraBaseUrl', label: 'Jira Base URL', type: 'text', placeholder: 'e.g., https://your-company.atlassian.net' } as const,
    { key: 'commitAnalysisExpanded', label: 'Commit Analysis Expanded', type: 'checkbox', defaultValue: 'false' } as const,
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

function SettingsPage({ onClose, onDeleteAllRows }: { onClose: () => void, onDeleteAllRows: () => void }) {
    const settings = useSettings();
    const { forceShowIntroduction } = useIntroduction();
    const { validateRegex } = useCommitValidation();

    const [recurringEvents, setRecurringEvents] = React.useState<RecurringEvent[]>(() => {
        const stored = localStorage.getItem('recurringEvents');
        return stored ? JSON.parse(stored) : [
            { id: 'endSprint', name: 'End Sprint Event', day: 'Friday', durationMinutes: '180' },
            { id: 'backlogRefinement', name: 'Backlog Refinement', day: 'Friday', durationMinutes: '60' },
        ];
    });


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
        settings?.updateSetting(key, newValue);
    };



    return (
        <Modal title="Settings" onClose={onClose} maxWidth="4xl">
            <JiraCredentialsForm />

            <GitHubConnectionForm />

            <CommitAnalysisSettings 
                showCollapsible={false} 
                containerClassName="bg-white rounded-lg shadow-sm border border-gray-200 p-6" 
            />

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
                <div className="space-y-4">
                    {SETTINGS_FIELDS.filter(f => !f.key.startsWith('github') && !f.key.startsWith('scrum') && !['dayStartTime', 'dayEndTime', 'commitAnalysisExpanded'].includes(f.key)).map(field => {
                        // Hide "Week Start Day" when "Hide Weekends" is enabled
                        if (field.key === 'weekStartDay' && settings?.settings['hideWeekends'] === 'true') {
                            return null;
                        }
                        
                        return (
                        <div key={field.key}>
                            {field.type === 'checkbox' ? (
                                <label htmlFor={field.key} className="flex items-center cursor-pointer">
                                    <input
                                        id={field.key}
                                        type="checkbox"
                                        checked={settings?.settings[field.key] === 'true'}
                                        onChange={e => handleChange(field.key, e.target.checked ? 'true' : 'false')}
                                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        {field.label}
                                    </span>
                                </label>
                            ) : field.type === 'select' ? (
                                <>
                                    <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-2">
                                        {field.label}
                                    </label>
                                    <select
                                        id={field.key}
                                        value={settings?.settings[field.key] || ''}
                                        onChange={e => handleChange(field.key, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {'options' in field && field.options.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </>
                            ) : (
                                <>
                                    <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-2">
                                        {field.label}
                                    </label>
                                    <input
                                        id={field.key}
                                        type={field.type}
                                        value={settings?.settings[field.key] || ''}
                                        onChange={e => handleChange(field.key, e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                                            field.key === 'taskIdRegex' && validateRegex(settings?.settings[field.key] || '') 
                                                ? 'border-red-500 focus:ring-red-500' 
                                                : 'border-gray-200 focus:ring-blue-500'
                                        }`}
                                        placeholder={'placeholder' in field ? field.placeholder : undefined}
                                    />
                                    {field.key === 'taskIdRegex' && validateRegex(settings?.settings[field.key] || '') && (
                                        <p className="mt-1 text-sm text-red-600">
                                            {validateRegex(settings?.settings[field.key] || '')}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                        );
                    })}
                </div>
            </div>


            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recurring Events</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Configure recurring meetings or events that happen weekly. These will generate clickable buttons in each week view that automatically add time entries for the selected day with the specified duration. Perfect for scrum events, standup meetings, or other regular activities.
                </p>
                
                {/* Scrum Settings */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-gray-800 mb-3">Scrum Settings</h4>
                    <div className="space-y-3">
                        {SETTINGS_FIELDS.filter(f => f.key.startsWith('scrum')).map(field => (
                            <div key={field.key}>
                                <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-2">
                                    {field.label}
                                </label>
                                <input
                                    id={field.key}
                                    type={field.type}
                                    value={settings?.settings[field.key] || ''}
                                    onChange={e => handleChange(field.key, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={'placeholder' in field ? field.placeholder : undefined}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Name</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Task ID</th>
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
                            forceShowIntroduction();
                            onClose();
                        }}
                        className="text-blue-700 border-blue-200 hover:bg-blue-50"
                    >
                        Show Introduction
                    </Button>
                    <p className="text-xs text-gray-500">
                        Reopen the introduction screen to learn about the app features and download the background tracker.
                    </p>
                    
                    <Button
                        variant="secondary"
                        onClick={() => {
                            if (window.confirm('Are you sure you want to delete all time entries? Your settings and CSV file will not be affected.')) {
                                onDeleteAllRows();
                                onClose();
                            }
                        }}
                        className="text-red-700 border-red-200 hover:bg-red-50"
                    >
                        Delete All Time Entries
                    </Button>
                    <p className="text-xs text-gray-500">
                        This will delete all loaded time entries from the current session. Your settings, connections, and original CSV file remain unchanged. You can re-upload data anytime.
                    </p>
                </div>
                
                {/* Attribution */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-400 text-center">
                        Stopwatch icon by{' '}
                        <a 
                            href="https://iconscout.com/contributors/serpenttina" 
                            className="underline hover:text-gray-600" 
                            target="_blank" 
                            rel="noopener noreferrer"
                        >
                            Nagarjan S
                        </a>
                        {' '}from{' '}
                        <a 
                            href="https://iconscout.com/icons/stopwatch" 
                            className="underline hover:text-gray-600" 
                            target="_blank" 
                            rel="noopener noreferrer"
                        >
                            Iconscout
                        </a>
                    </p>
                </div>
            </div>
        </Modal>
    );
}

export default SettingsPage;