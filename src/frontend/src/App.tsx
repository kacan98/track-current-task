import { useEffect, useRef, useState } from 'react';
import { Button } from './components/Button';
import { DateRangePicker } from './components/DateRangePicker';
import { LogTable } from './components/LogTable';
import SettingsPage from './components/SettingsPage';
import type { LogEntry } from './components/types';
import { logWorkToJira } from './services/JiraIntegration';

function startOfWeek(date: Date, opts?: { weekStartsOn?: number }) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day < 1 ? 7 : day) - (opts?.weekStartsOn ?? 0);
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
    const weekStart = current;
    const weekEnd = endOfWeek(current, { weekStartsOn: 1 });
    const weekEntries = entries.filter(e => {
      const d = new Date(e.date);
      return d >= weekStart && d <= weekEnd;
    });
    weeks.push({ start: weekStart, end: weekEnd, entries: weekEntries });
    current = new Date(weekEnd);
    current.setDate(current.getDate() + 1);
  }
  return weeks;
}

function App() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [editedHours, setEditedHours] = useState<{[key:string]: string}>({});
  const settingsDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    fetch('/.TrackCurrentTask/activity_log.csv')
      .then(res => res.text())
      .then(text => {
        const lines = text.trim().split(/\r?\n/);
        const header = lines[0].replace(/\r/g, '').split(',').map(h => h.trim());
        const idx = {
          date: header.indexOf('date'),
          taskId: header.indexOf('taskId'),
          hours: header.indexOf('hours'),
          sentToJira: header.indexOf('sentToJira'),
        };
        if (idx.sentToJira === -1) {
          setError('CSV missing sentToJira column.');
          return;
        }
        const data = lines.slice(1).map(line => {
          const cols = line.replace(/\r/g, '').split(',').map(c => c.trim());
          return {
            date: cols[idx.date],
            taskId: cols[idx.taskId],
            hours: parseFloat(cols[idx.hours]),
            sentToJira: cols[idx.sentToJira] === 'true',
          };
        });
        setEntries(data);
      })
      .catch(() => setError('Failed to load .TrackCurrentTask/activity_log.csv'));
  }, []);

  const handleSendToJira = async (entry: LogEntry) => {
    const key = `${entry.taskId}|${entry.date}`;
    const hoursValue = editedHours[key] !== undefined ? parseFloat(editedHours[key]) : entry.hours;
    try {
      // Format date for Jira: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
      const started = `${entry.date}T09:00:00.000+0000`;
      await logWorkToJira(entry.taskId, hoursValue*60*60, started);
      alert('Worklog sent to Jira!');
      // Optionally update UI to mark as sent
    } catch (e: any) {
      alert('Failed to send worklog to Jira: ' + (e?.message || e));
    }
  };

  const handleSendEventsToJira = async (entries: LogEntry[]) => {
    for (const entry of entries) {
      try {
        await handleSendToJira(entry);
      } catch (e) {
        console.error('Failed to send entry to Jira:', entry, e);
      }
    }
    alert('All events sent to Jira!');
  };

  const filtered = getEntriesInRange(entries, new Date(from), new Date(to));
  const weeks = splitEntriesByWeek(filtered, new Date(from), new Date(to));

  const openSettingsModal = () => {
    settingsDialogRef.current?.showModal();
  };

  const closeSettingsModal = () => {
    settingsDialogRef.current?.close();
  };

  useEffect(() => {
    const dialogEl = settingsDialogRef.current;
    if (!dialogEl) return;
    const handleClick = (event: MouseEvent) => {
      const modalContent = document.getElementById('settings-modal-content');
      if (!modalContent) return;
      // If the click target is not inside the modal content, close the dialog
      if (!modalContent.contains(event.target as Node)) {
        closeSettingsModal();
      }
    };
    dialogEl.addEventListener('click', handleClick);
    return () => {
      dialogEl.removeEventListener('click', handleClick);
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600 text-sm">error</span>
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error Loading Data</h3>
              <p className="text-red-700 text-sm">{error}</p>
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
          <Button variant="secondary" className="flex items-center gap-2" onClick={openSettingsModal}>
            <span className="material-symbols-outlined text-sm">settings</span>
            Settings
          </Button>
        </div>

        <div className="mb-8">
          <DateRangePicker 
            from={from} 
            to={to} 
            onChange={(f, t) => { setFrom(f); setTo(t); }} 
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            {weeks.length > 1
              ? [...weeks].sort((a, b) => b.start.getTime() - a.start.getTime()).map(week => (
                  <div key={week.start.toISOString()} className="mb-8 last:mb-0">
                    <LogTable
                      entries={week.entries}
                      editedHours={editedHours}
                      setEditedHours={setEditedHours}
                      handleSendEventToJira={handleSendToJira}
                      handleSendEventsToJira={() => handleSendEventsToJira(week.entries)}
                      weekStart={format(week.start, 'yyyy-MM-dd')}
                      weekEnd={format(week.end, 'yyyy-MM-dd')}
                    />
                  </div>
                ))
              : <LogTable
                  entries={filtered}
                  editedHours={editedHours}
                  setEditedHours={setEditedHours}
                  handleSendEventToJira={handleSendToJira}
                  handleSendEventsToJira={() => handleSendEventsToJira(filtered)}
                />
            }
          </div>
        </div>
      </div>

      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
      
      <dialog 
        ref={settingsDialogRef} 
        className="fixed inset-0 z-50 w-full h-full bg-transparent border-0 p-0"
      >
        <div className="relative z-10" id="settings-modal-content">
          <SettingsPage onClose={closeSettingsModal}></SettingsPage>
        </div>
      </dialog>
    </div>
  );
}

export default App;