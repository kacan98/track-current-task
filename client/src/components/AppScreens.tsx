import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { DragDropUpload } from '@/components/ui/DragDropUpload';
import { DateRangePicker } from '@/components/forms/DateRangePicker';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { JiraAuthModal } from '@/components/modals/JiraAuthModal';
import { WeeklyLogDisplay } from '@/components/table/WeeklyLogDisplay';
import { IntroductionScreen } from '@/components/IntroductionScreen';
import { useAuthentication } from '@/hooks/useAuthentication';
import { useLogEntries } from '@/contexts/LogEntriesContext';
import { useToastContext } from '@/contexts/ToastContext';
import { useDataLoader } from '@/hooks/useDataLoader';
import { useDateRange } from '@/hooks/useDateRange';
import { useJiraWorklog } from '@/hooks/useJiraWorklog';
import { useIntroduction } from '@/contexts/IntroductionContext';
import type { LogEntry } from '@/types';

const ScreenLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-lg w-full">
      {children}
    </div>
  </div>
);



const UploadContent: React.FC<{
  error: string | null;
  loadingFromBackend: boolean;
  onFileSelect: (file: File) => void;
  onLoadFromBackend: () => void;
  onError: (error: string) => void;
  onSkipUpload?: () => void;
}> = ({ error, loadingFromBackend, onFileSelect, onLoadFromBackend, onError, onSkipUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadCSVTemplate = () => {
    const csvContent = `date,taskId,repository,hours
2024-01-15,PROJ-123,my-awesome-project,2.5
2024-01-15,PROJ-124,another-project,1.0
2024-01-16,PROJ-123,my-awesome-project,3.0`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'time-tracking-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Activity Log</h3>
        <p className="text-gray-600 text-sm">
          Choose how you'd like to get your time data into the system
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      
      <div className="space-y-4">
        {/* Primary: Upload CSV File */}
        <DragDropUpload
          onFileSelect={onFileSelect}
          onError={onError}
          className="relative"
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
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-6 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 mb-1">📁 Upload CSV File</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Drag & drop or click to select your time tracking CSV file. Supports files from the background tracker or any CSV with date, taskId, repository, and hours columns.
                </p>
                <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                  <strong>💡 Tip:</strong> Background tracker files are typically saved in: 
                  <code 
                    className="ml-1 font-mono bg-white px-1 rounded border select-all cursor-text"
                    onClick={(e) => {
                      e.stopPropagation();
                      const range = document.createRange();
                      range.selectNodeContents(e.currentTarget);
                      const selection = window.getSelection();
                      selection?.removeAllRanges();
                      selection?.addRange(range);
                    }}
                    title="Click to select path for copying"
                  >
                    C:\Users\[username]\AppData\Roaming\TrackCurrentTask\
                  </code>
                </div>
              </div>
            </div>
          </button>
        </DragDropUpload>
        
        {/* Secondary: Download CSV Template */}
        <button
          onClick={downloadCSVTemplate}
          className="w-full p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all text-left cursor-pointer"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 mb-1">📋 Download CSV Template</h4>
              <p className="text-sm text-gray-600">
                Get a sample file with example data to fill in with your time entries
              </p>
            </div>
          </div>
        </button>
        
        {/* Secondary: Start from scratch */}
        {onSkipUpload && (
          <button
            onClick={onSkipUpload}
            className="w-full p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all text-left cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 mb-1">🚀 Start from scratch</h4>
                <p className="text-sm text-gray-600">
                  Skip uploading and start with an empty workspace. Perfect if you plan to use GitHub's Auto-fill Week or add entries manually.
                </p>
              </div>
            </div>
          </button>
        )}
        
        {/* Last: Load from Filesystem */}
        <button
          onClick={onLoadFromBackend}
          disabled={import.meta.env.PROD || loadingFromBackend}
          className="w-full p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 mb-1">
                💾 {loadingFromBackend ? 'Loading from Filesystem...' : 'Load from Filesystem'}
              </h4>
              <p className="text-sm text-gray-600">
                {import.meta.env.PROD 
                  ? 'Load CSV files directly from your computer (only works when running locally)'
                  : 'Load CSV files directly from your local development environment'
                }
              </p>
            </div>
          </div>
        </button>
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
  const { isAuthenticated, isCheckingAuth, handleAuthSuccess } = useAuthentication();
  const { showIntroduction, handleIntroductionComplete, handleDontShowAgain } = useIntroduction();
  
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showJiraAuth, setShowJiraAuth] = useState(false);

  // Clear uploadSkipped flag on app start if there are no entries (fresh start/refresh)
  useEffect(() => {
    if (entries.length === 0) {
      sessionStorage.removeItem('uploadSkipped');
    }
  }, [entries.length]);

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
    // Check if user is authenticated with Jira before sending
    if (isCheckingAuth) {
      showError('Checking Jira authentication status...');
      return;
    }

    if (!isAuthenticated) {
      setShowJiraAuth(true);
      return;
    }

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
  
  // Show introduction screen if applicable
  if (showIntroduction) {
    return <IntroductionScreen 
      onContinue={handleIntroductionComplete} 
      onDontShowAgain={handleDontShowAgain}
    />;
  }

  // Show upload screen first if no data loaded or error occurred
  // Only skip upload screen if user explicitly skipped it AND there's no error
  const uploadSkipped = sessionStorage.getItem('uploadSkipped') === 'true';
  const shouldShowUpload = error || (entries.length === 0 && !uploadSkipped);
  
  if (shouldShowUpload) {
    return (
      <ScreenLayout>
        <div className="max-w-4xl mx-auto">
          <UploadContent
            error={error}
            loadingFromBackend={loadingFromBackend}
            onFileSelect={handleFileSelect}
            onLoadFromBackend={handleLoadFromBackend}
            onError={setError}
            onSkipUpload={() => {
              // Set a temporary flag to remember upload was skipped
              sessionStorage.setItem('uploadSkipped', 'true');
              
              // Start with empty data
              setEntries([]);
              setError(null); // Clear any error state to dismiss upload screen
              showSuccess('Starting with empty workspace. Use Auto-fill Week or add entries manually!');
            }}
          />
        </div>
      </ScreenLayout>
    );
  }

  // Show main application
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Log Bridge</h1>
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
      
      <JiraAuthModal
        isOpen={showJiraAuth}
        onClose={() => setShowJiraAuth(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
};
