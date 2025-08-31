import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { JiraCredentialsForm } from '@/components/forms/JiraCredentialsForm';
import { DragDropUpload } from '@/components/ui/DragDropUpload';
import { DateRangePicker } from '@/components/forms/DateRangePicker';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { WeeklyLogDisplay } from '@/components/table/WeeklyLogDisplay';
import { useAuthentication } from '@/hooks/useAuthentication';
import { useLogEntries } from '@/contexts/LogEntriesContext';
import { useToastContext } from '@/contexts/ToastContext';
import { useDataLoader } from '@/hooks/useDataLoader';
import { useDateRange } from '@/hooks/useDateRange';
import { useJiraWorklog } from '@/hooks/useJiraWorklog';
import type { LogEntry } from '@/types';

const ScreenLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-lg w-full">
      {children}
    </div>
  </div>
);

const LoadingContent: React.FC = () => (
  <div className="text-center">
    <h3 className="font-semibold text-gray-900 mb-2">Loading...</h3>
    <p className="text-gray-600 text-sm">Checking authentication status</p>
  </div>
);

const AuthenticationContent: React.FC<{
  onAuthSuccess: () => void;
  onSkipAuth: () => void;
}> = ({ onAuthSuccess, onSkipAuth }) => (
  <>
    <div className="text-center mb-6">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="material-symbols-outlined text-blue-600 text-2xl">login</span>
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">Connect to Jira</h3>
      <p className="text-gray-600 text-sm">
        Please authenticate with Jira to log work hours to your tasks.
      </p>
    </div>
    <JiraCredentialsForm onAuthSuccess={onAuthSuccess} />
    <div className="text-center mt-4">
      <Button
        variant="secondary"
        onClick={onSkipAuth}
        className="text-sm"
      >
        Skip for now
      </Button>
    </div>
  </>
);

const UploadContent: React.FC<{
  error: string | null;
  loadingFromBackend: boolean;
  onFileSelect: (file: File) => void;
  onLoadFromBackend: () => void;
  onError: (error: string) => void;
}> = ({ error, loadingFromBackend, onFileSelect, onLoadFromBackend, onError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="text-center">
      <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 p-3">
        <span className="text-blue-600 text-xs font-semibold text-center">Upload Activity Log</span>
      </div>
      <p className="text-gray-600 text-sm mb-6">
        Upload your activity log to get started
      </p>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      
      <DragDropUpload
        onFileSelect={onFileSelect}
        onError={onError}
        className="relative border-2 border-dashed rounded-lg p-8 transition-all"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
          }}
          className="sr-only"
          aria-label="Upload CSV file"
        />
        
        <div className="space-y-4">
          <div className="w-12 h-12 mx-auto">
            <svg className="w-full h-full text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div className="flex gap-2 justify-center">
            <Button
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm"
            >
              Select CSV File
            </Button>
            <Button
              variant="secondary"
              onClick={onLoadFromBackend}
              disabled={loadingFromBackend}
              className="text-sm"
            >
              {loadingFromBackend ? 'Loading...' : 'Load from Filesystem'}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            drag and drop, select file, or load from filesystem
          </p>
          
          <p className="text-xs text-gray-400">
            CSV files only (max 10MB)
          </p>
        </div>
      </DragDropUpload>
      
      <div className="mt-6 text-left bg-gray-50 rounded-lg p-4">
        <p className="text-xs font-medium text-gray-700 mb-2">Expected CSV format:</p>
        <code className="text-xs text-gray-600 font-mono">
          date, taskId, repository, hours
        </code>
      </div>
    </div>
  );
};

export const AppScreens: React.FC = () => {
  const { entries, setEntries, markAsSentToJira } = useLogEntries();
  const { showSuccess, showError } = useToastContext();
  const { isLoading: loadingFromBackend, loadFromBackend, processFile } = useDataLoader();
  const { sendWorklog } = useJiraWorklog();
  const { from, to, filtered, weeks, handleDateRangeChange } = useDateRange(entries);
  const { isAuthenticated, isCheckingAuth, handleAuthSuccess, skipAuth } = useAuthentication();
  
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Handlers
  const handleLoadFromBackend = async () => {
    setError(null);
    const result = await loadFromBackend();

    if (result.success && result.data) {
      setEntries(result.data);
      setError(null);
      showSuccess('Activity log loaded from backend successfully');
    } else {
      setError(result.error || 'Failed to load from backend');
      showError('Failed to load from backend');
    }
  };

  const handleFileSelect = async (file: File) => {
    const result = await processFile(file);

    if (result.success && result.data) {
      setEntries(result.data);
      setError(null);
    } else {
      setError(result.error || 'Failed to process file');
    }
  };

  const handleSendToJira = async (entry: LogEntry) => {
    const result = await sendWorklog(entry);

    if (result.success) {
      markAsSentToJira(entry.id);
      showSuccess('Worklog sent to Jira successfully!');
    } else {
      showError(result.error || 'Failed to send worklog to Jira');
    }
  };

  const handleDeleteAllRows = () => {
    setEntries([]);
    setError('No data loaded. Please upload a CSV file or load from backend.');
    setShowSettings(false);
  };
  
  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <ScreenLayout>
        <LoadingContent />
      </ScreenLayout>
    );
  }

  // Show Jira login first if not authenticated
  if (!isAuthenticated) {
    return (
      <ScreenLayout>
        <AuthenticationContent 
          onAuthSuccess={handleAuthSuccess}
          onSkipAuth={skipAuth}
        />
      </ScreenLayout>
    );
  }

  // Show upload screen if authenticated but no data loaded or error occurred
  if (error || entries.length === 0) {
    return (
      <ScreenLayout>
        <UploadContent
          error={error}
          loadingFromBackend={loadingFromBackend}
          onFileSelect={handleFileSelect}
          onLoadFromBackend={handleLoadFromBackend}
          onError={setError}
        />
      </ScreenLayout>
    );
  }

  // Show main application
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Track Current Task</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary" 
              className="flex items-center gap-2"
              onClick={() => setShowSettings(true)}
            >
              <span className="material-symbols-outlined text-sm">settings</span>
              Settings
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <DateRangePicker
            from={from}
            to={to}
            onChange={handleDateRangeChange}
          />
        </div>

        <WeeklyLogDisplay
          weeks={weeks}
          filtered={filtered}
          onSendToJira={handleSendToJira}
        />
      </div>

      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
      
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onDeleteAllRows={handleDeleteAllRows}
      />
    </div>
  );
};
