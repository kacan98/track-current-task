import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { useCommitValidation } from '../hooks/useCommitValidation';
import { useSettings } from '../../../../contexts/SettingsContext';

interface CommitAnalysisSettingsProps {
  showCollapsible?: boolean;
  showDescription?: boolean;
  containerClassName?: string;
}

export function CommitAnalysisSettings({ 
  showCollapsible = true, 
  showDescription = true, 
  containerClassName = "mb-6" 
}: CommitAnalysisSettingsProps) {
  const settings = useSettings();
  const { validateRegex } = useCommitValidation();

  const content = (
    <div className="space-y-4">
      {showDescription && (
        <p className="text-sm text-gray-600 mb-4">
          Configure settings for analyzing your GitHub commits to generate work log entries based on branch patterns and working hours.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          id="dayStartTime"
          type="time"
          step="60"
          value={settings?.getSetting('dayStartTime') || '09:00'}
          onChange={(e) => settings?.updateSetting('dayStartTime', e.target.value)}
          label="Day Start Time"
          icon={<svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>}
          className="font-mono cursor-pointer"
        />
        <Input
          id="dayEndTime"
          type="time"
          step="60"
          value={settings?.getSetting('dayEndTime') || '17:00'}
          onChange={(e) => settings?.updateSetting('dayEndTime', e.target.value)}
          label="Day End Time"
          icon={<svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>}
          className="font-mono cursor-pointer"
        />
        <Input
          id="taskIdRegex"
          type="text"
          value={settings?.getSetting('taskIdRegex') || 'DMO-\\d+'}
          onChange={(e) => settings?.updateSetting('taskIdRegex', e.target.value)}
          placeholder="e.g., (DMO|DFO)-\\d+"
          label="Task ID Regex Pattern"
          helpText="Regular expression to extract task IDs from branch names (e.g., (DMO|DFO)-\d+ matches DMO-1234 or DFO-5678)"
          {...(validateRegex(settings?.getSetting('taskIdRegex') || 'DMO-\\d+') ? { error: validateRegex(settings?.getSetting('taskIdRegex') || 'DMO-\\d+')! } : {})}
        />
      </div>
      <p className="text-xs text-gray-600 mt-2">
        These settings control how commits are grouped into work sessions and how task IDs are extracted from branch names.
      </p>
    </div>
  );

  if (!showCollapsible) {
    return (
      <div className={containerClassName}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Commit Analysis Settings</h3>
        {content}
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => settings?.updateSetting('commitAnalysisExpanded', settings.getBooleanSetting('commitAnalysisExpanded') ? 'false' : 'true')}
      >
        <h3 className="text-lg font-medium text-gray-900">Commit Analysis Settings</h3>
        <Button variant="secondary" className="text-xs px-2 py-1">
          {settings?.getBooleanSetting('commitAnalysisExpanded') ? '▼ Hide' : '▶ Show'}
        </Button>
      </div>
      
      {settings?.getBooleanSetting('commitAnalysisExpanded') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          {content}
        </div>
      )}
    </div>
  );
}