import { DateRangePicker } from './components/DateRangePicker';
import { LogTable } from './components/LogTable';
import type { LogEntry } from './components/types';
import { useEffect, useState } from 'react';

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

  const handleSendToJira = (entry: LogEntry) => {
    const key = `${entry.taskId}|${entry.date}`;
    const hoursValue = editedHours[key] !== undefined ? parseFloat(editedHours[key]) : entry.hours;
    alert(`Send to Jira: ${entry.taskId} on ${entry.date} - ${hoursValue}h`);
  };

  const filtered = getEntriesInRange(entries, new Date(from), new Date(to));

  if (error) return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100"><div className="text-red-500 text-lg font-semibold bg-white/80 rounded-lg shadow-lg px-8 py-6 border border-red-200">{error}</div></div>;

  return (
    <div className="fixed inset-0 min-h-screen w-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-start py-6 px-1 z-0 overflow-auto">
      <div className="relative w-full max-w-5xl bg-white/80 rounded-2xl shadow-xl border border-blue-100 p-3 sm:p-6 z-10 flex flex-col">
        <h1 className="text-3xl font-extrabold mb-4 text-center text-blue-700 tracking-tight drop-shadow">Hours</h1>
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
    </div>
  );
}

export default App;
