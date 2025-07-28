import { useEffect, useState } from 'react';
import './App.css';

interface LogEntry {
  date: string;
  taskId: string;
  hours: number;
  sentToJira: boolean;
}

function getEntriesInRange(entries: LogEntry[], from: Date, to: Date): LogEntry[] {
  return entries.filter(e => {
    const d = new Date(e.date);
    return d >= from && d <= to;
  });
}

function DateRangePicker({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  return (
    <div className="flex flex-wrap gap-4 items-center mb-6 p-4 bg-white rounded-xl shadow border border-gray-200">
      <div className="flex flex-col gap-1">
        <label className="font-semibold text-gray-700" htmlFor="from-date">From</label>
        <input
          id="from-date"
          type="date"
          value={from}
          onChange={e => onChange(e.target.value, to)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-semibold text-gray-700" htmlFor="to-date">To</label>
        <input
          id="to-date"
          type="date"
          value={to}
          onChange={e => onChange(from, e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        />
      </div>
    </div>
  );
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
    const hoursForTask = entries.filter(e => e.taskId === entry.taskId && e.date === entry.date)
      .reduce((sum, e) => sum + e.hours, 0);
    // Simulate sending to Jira
    console.log(`Send to Jira: ${entry.taskId} on ${entry.date} - ${hoursForTask}h`);
    alert(`Send to Jira: ${entry.taskId} on ${entry.date} - ${hoursForTask}h`);
  };

  const filtered = getEntriesInRange(entries, new Date(from), new Date(to));

  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Hours</h1>
      <div className="mb-8">
        <h2 className="font-semibold mb-3 text-lg text-gray-700">Settings</h2>
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </div>
      <div className="overflow-x-auto rounded-xl shadow border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left">Date</th>
              <th className="px-6 py-4 text-left">Task</th>
              <th className="px-6 py-4 text-left">Hours</th>
              <th className="px-6 py-4 text-left">Sent to Jira</th>
              <th className="px-6 py-4 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">No entries in this range.</td>
              </tr>
            ) : (
              filtered.map((entry, i) => (
                <tr key={i} className="border-t hover:bg-blue-50 transition">
                  <td className="px-6 py-3">{entry.date}</td>
                  <td className="px-6 py-3">{entry.taskId}</td>
                  <td className="px-6 py-3">{entry.hours}</td>
                  <td className="px-6 py-3">{entry.sentToJira ? '✅' : '❌'}</td>
                  <td className="px-6 py-3">
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                      disabled={entry.sentToJira}
                      onClick={() => handleSendToJira(entry)}
                    >
                      Send to Jira
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
