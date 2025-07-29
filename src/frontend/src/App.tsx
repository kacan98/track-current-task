import { DateRangePicker } from './components/DateRangePicker';
import { LogTable } from './components/LogTable';
import type { LogEntry } from './components/types';
import React, { useEffect, useRef, useState } from 'react';
import SettingsPage from './components/SettingsPage';
import { logWorkToJira } from './services/JiraIntegration';
import { Button } from './components/Button';

function getEntriesInRange(entries: LogEntry[], from: Date, to: Date): LogEntry[] {
  return entries.filter(e => {
    const d = new Date(e.date);
    return d >= from && d <= to;
  });
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

  const filtered = getEntriesInRange(entries, new Date(from), new Date(to));

  const openSettingsModal = () => {
    settingsDialogRef.current?.showModal();
  };

  const closeSettingsModal = () => {
    settingsDialogRef.current?.close();
  };

  if (error) return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100"><div className="text-red-500 text-lg font-semibold bg-white/80 rounded-lg shadow-lg px-8 py-6 border border-red-200">{error}</div></div>;
  return (
    <div className="fixed inset-0 min-h-screen w-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-start py-6 px-1 z-0 overflow-auto">
      <div className="relative w-full max-w-5xl bg-white/80 rounded-2xl shadow-xl border border-blue-100 p-3 sm:p-6 z-10 flex flex-col">
        <div className="flex justify-end mb-2">
          <Button
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={openSettingsModal}
          >
            Settings
          </Button>
        </div>
        <h1 className="text-3xl font-extrabold mb-4 text-center text-blue-700 tracking-tight drop-shadow">Hours</h1>
        {/* <JiraCredentialsForm /> moved to SettingsPage */}
        <div className="mb-4 flex flex-col items-center justify-center">
          <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        </div>
        <div className="flex-1 min-h-0">
          <div className="overflow-x-auto overflow-y-auto max-h-[60vh] rounded-xl border shadow-sm bg-white/70">
            <LogTable
              entries={filtered}
              editedHours={editedHours}
              setEditedHours={setEditedHours}
              handleSendToJira={handleSendToJira}
            />
          </div>
        </div>
      </div>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
      {/* Native HTML modal for settings */}
      <dialog ref={settingsDialogRef} className="z-50 p-0 border-0" style={{position: 'fixed', inset: 0, width: '100vw', height: '100vh', background: 'none'}}>
        <div className="fixed inset-0 bg-black bg-opacity-50 z-0" style={{pointerEvents: 'none'}}></div>
        <div tabIndex={-1} style={{outline: 'none', position: 'relative', zIndex: 1}}>
          <SettingsPage onClose={closeSettingsModal} />
        </div>
      </dialog>
    </div>
  );
}

export default App;
