import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createEntry } from './utils/entryUtils';
import { API_ROUTES } from '../../shared/apiRoutes';
import { Button } from './components/Button';
import { DateRangePicker } from './components/DateRangePicker';
import { JiraCredentialsForm } from './components/JiraCredentialsForm';
import { LogTable } from './components/LogTable';
import SettingsPage from './components/SettingsPage';
import { Toast } from './components/Toast';
import type { LogEntry } from './components/types';
import { useLogEntries } from './contexts/LogEntriesContext';
import { getAuthStatus, logWorkToJira } from './services/JiraIntegration';

function startOfWeek(date: Date, opts?: { weekStartsOn?: number }) {
  const d = new Date(date);
  const weekStartsOn = opts?.weekStartsOn ?? 0;
  const day = d.getDay();
  const diff = (day + 7 - weekStartsOn) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date, opts?: { weekStartsOn?: number }) {
  const d = startOfWeek(date, opts);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function format(date: Date, fmt: string) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (fmt === 'yyyy-MM-dd') {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  if (fmt === 'EEEE') {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return date.toISOString();
}

function getEntriesInRange(entries: LogEntry[], from: Date, to: Date): LogEntry[] {
  return entries.filter(e => {
    const d = new Date(e.date);
    return d >= from && d <= to;
  });
}

function splitEntriesByWeek(entries: LogEntry[], from: Date, to: Date) {
  const weeks: Array<{ start: Date; end: Date; entries: LogEntry[] }> = [];
  let current = startOfWeek(from, { weekStartsOn: 1 }); // Monday
  const last = endOfWeek(to, { weekStartsOn: 1 });
  while (current <= last) {
    const weekStart = new Date(current);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekEntries = entries.filter(e => {
      const d = new Date(e.date);
      return d >= weekStart && d <= weekEnd;
    });
    weeks.push({ start: weekStart, end: weekEnd, entries: weekEntries });
    // Advance to next Monday
    current = new Date(weekStart);
    current.setDate(current.getDate() + 7);
    current.setHours(0, 0, 0, 0);
  }
  return weeks;
}

function App() {
  const { 
    entries, 
    setEntries, 
    markAsSentToJira
  } = useLogEntries();
  
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [loadingFromBackend, setLoadingFromBackend] = useState(false);
  const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day + 6) % 7; // Calculate days from Monday
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const [from, setFrom] = useState<string>(() => {
    // Default to last 5 weeks, starting from Monday
    const fiveWeeksAgo = new Date();
    fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35);
    const startOfWeek = getStartOfWeek(fiveWeeksAgo);
    return startOfWeek.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [isDragging, setIsDragging] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check authentication status
    getAuthStatus().then(status => {
      setAuthStatus(status);
    }).catch(() => {
      setAuthStatus({ authenticated: false });
    }).finally(() => {
      setCheckingAuth(false);
    });
  }, []);

  const loadFromBackend = async () => {
    setLoadingFromBackend(true);
    setError(null);
    
    try {
      const res = await fetch('/api' + API_ROUTES.FILES.ACTIVITY_LOG);
      
      if (!res.ok) {
        throw new Error(`Activity log not found on backend (${res.status})`);
      }
      
      const text = await res.text();
      if (!text) throw new Error('Empty response from backend');
      
      const lines = text.trim().split(/\r?\n/);
      const header = lines[0].replace(/\r/g, '').split(',').map(h => h.trim());
      const idx = {
        date: header.indexOf('date'),
        taskId: header.indexOf('taskId'),
        hours: header.indexOf('hours'),
      };

      const data = lines.slice(1).map(line => {
        const cols = line.replace(/\r/g, '').split(',').map(c => c.trim());
        return createEntry(
          cols[idx.taskId],
          cols[idx.date],
          parseFloat(cols[idx.hours])
        );
      });
      
      setEntries(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load from backend');
    } finally {
      setLoadingFromBackend(false);
    }
  };

  // Context handles all localStorage persistence now

  const handleSendToJira = async (entry: LogEntry) => {
    try {
      // Format date for Jira: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
      const started = `${entry.date}T09:00:00.000+0000`;
      await logWorkToJira(entry.taskId, entry.hours*60*60, started);
      markAsSentToJira(entry.id);
      setToast({ message: 'Worklog sent to Jira successfully!', type: 'success' });
    } catch (e: any) {
      setToast({ message: 'Failed to send worklog to Jira: ' + (e?.message || e), type: 'error' });
    }
  };


  const handleDeleteAllRows = () => {
    setEntries([]);
  };

  const filtered = getEntriesInRange(entries, new Date(from), new Date(to));
  const weeks = splitEntriesByWeek(filtered, new Date(from), new Date(to));

  const openSettingsModal = () => {
    setShowSettings(true);
  };

  const closeSettingsModal = () => {
    setShowSettings(false);
  };

  const processCSVFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const lines = text.trim().split(/\r?\n/);
        const header = lines[0].replace(/\r/g, '').split(',').map(h => h.trim());
        const idx = {
          date: header.indexOf('date'),
          taskId: header.indexOf('taskId'),
          hours: header.indexOf('hours'),
        };

        const data = lines.slice(1).map(line => {
          const cols = line.replace(/\r/g, '').split(',').map(c => c.trim());
          return createEntry(
            cols[idx.taskId],
            cols[idx.date],
            parseFloat(cols[idx.hours])
          );
        });
        setEntries(data);
        setError(null);
      } catch (err) {
        setError('Failed to parse CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processCSVFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        processCSVFile(file);
      } else {
        setError('Please upload a CSV file.');
      }
    }
  };


  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-lg w-full text-center">
          <h3 className="font-semibold text-gray-900 mb-2">Loading...</h3>
          <p className="text-gray-600 text-sm">Checking authentication status</p>
        </div>
      </div>
    );
  }

  // Show Jira login first if not authenticated
  if (!authStatus?.authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-blue-600 text-2xl">login</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Connect to Jira</h3>
            <p className="text-gray-600 text-sm">
              Please authenticate with Jira to log work hours to your tasks.
            </p>
          </div>
          <JiraCredentialsForm onAuthSuccess={() => {
            setAuthStatus({ authenticated: true });
          }} />
          <div className="text-center mt-4">
            <Button
              variant="secondary"
              onClick={() => setAuthStatus({ authenticated: true })}
              className="text-sm"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show upload screen if authenticated but no data loaded or error occurred
  if (error || entries.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Track Your Hours</h1>
            <p className="text-gray-600 text-sm mb-6">
              Upload your activity log to get started
            </p>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            
            <div 
              className={`relative border-2 border-dashed rounded-lg p-8 transition-all ${
                isDragging 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400 bg-white'
              }`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
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
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Select CSV File
                  </button>
                  <Button
                    variant="secondary"
                    onClick={loadFromBackend}
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
            </div>
            
            <div className="mt-6 text-left bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-700 mb-2">Expected CSV format:</p>
              <code className="text-xs text-gray-600 font-mono">
                date, taskId, hours
              </code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Hours</h1>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="flex items-center gap-2" onClick={openSettingsModal}>
              <span className="material-symbols-outlined text-sm">settings</span>
              Settings
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <DateRangePicker 
            from={from} 
            to={to} 
            onChange={(f, t) => { 
              // Auto-snap 'from' date to start of week (Monday)
              const fromDate = getStartOfWeek(new Date(f));
              const snappedFrom = fromDate.toISOString().slice(0, 10);
              setFrom(snappedFrom); 
              setTo(t); 
            }} 
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            {weeks.length > 1
              ? [...weeks].sort((a, b) => b.start.getTime() - a.start.getTime()).map(week => (
                  <div key={week.start.toISOString()} className="mb-8 last:mb-0">
                    <LogTable
                      entries={week.entries}
                      weekStart={format(week.start, 'yyyy-MM-dd')}
                      weekEnd={format(week.end, 'yyyy-MM-dd')}
                      onSendToJira={handleSendToJira}
                    />
                  </div>
                ))
              : <LogTable
                  entries={filtered}
                  onSendToJira={handleSendToJira}
                />
            }
          </div>
        </div>
      </div>

      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
      
      {showSettings && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
          onClick={closeSettingsModal}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <SettingsPage onClose={closeSettingsModal} onDeleteAllRows={handleDeleteAllRows} />
          </div>
        </div>,
        document.body
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;