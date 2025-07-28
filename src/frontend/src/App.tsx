import { useEffect, useState } from 'react';

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
  // Helper to open native date picker if available
  function openDatePicker(id: string) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) {
      const wasReadOnly = el.readOnly;
      el.readOnly = false;
      // @ts-ignore: showPicker is not in TS types but is supported in modern browsers
      if (typeof (el as any).showPicker === 'function') {
        (el as any).showPicker();
      } else {
        el.click();
      }
      el.readOnly = wasReadOnly;
    }
  }

  // Helper to get date strings for quick range buttons
  function getQuickRange(range: 'currentWeek' | 'lastWeek' | 'last30Days' | 'thisYear') {
    const today = new Date();
    let start: Date, end: Date;
    if (range === 'currentWeek') {
      const day = today.getDay() || 7;
      start = new Date(today);
      start.setDate(today.getDate() - day + 1);
      end = new Date(today);
    } else if (range === 'lastWeek') {
      const day = today.getDay() || 7;
      end = new Date(today);
      end.setDate(today.getDate() - day);
      start = new Date(end);
      start.setDate(end.getDate() - 6);
    } else if (range === 'thisYear') {
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today);
    } else {
      end = new Date(today);
      start = new Date(today);
      start.setDate(today.getDate() - 29);
    }
    return {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
    };
  }

  return (
    <div className="flex flex-col gap-2 w-full items-center">
      <div className="flex gap-2 mb-2 flex-wrap justify-center">
        {[
          { label: 'Current week', range: 'currentWeek' },
          { label: 'Last week', range: 'lastWeek' },
          { label: 'Last 30 days', range: 'last30Days' },
          { label: 'This year', range: 'thisYear' },
        ].map(({ label, range }) => (
          <button
            key={range}
            className="px-3 py-1 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold transition cursor-pointer border border-blue-200"
            onClick={() => { const r = getQuickRange(range as any); onChange(r.from, r.to); }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
        <div className="flex flex-col items-center cursor-pointer group">
          <label htmlFor="from-date" className="text-sm mb-1 cursor-pointer select-none w-full text-center group-hover:text-blue-700 transition">From</label>
          <div
            className="relative w-full flex justify-center items-center cursor-pointer"
            tabIndex={0}
            onClick={() => openDatePicker('from-date')}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openDatePicker('from-date'); }}
            role="button"
            aria-label="Select from date"
          >
            <input
              id="from-date"
              type="date"
              value={from}
              onChange={e => onChange(e.target.value, to)}
              className="border rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-center w-32 bg-white"
              style={{ zIndex: 1 }}
              readOnly
            />
            <span className="absolute right-2 cursor-pointer text-gray-400 material-symbols-outlined select-none group-hover:text-blue-700 transition" style={{zIndex:2}}>
              calendar_month
            </span>
          </div>
        </div>
        <span className="text-gray-400 text-lg select-none">–</span>
        <div className="flex flex-col items-center cursor-pointer group">
          <label htmlFor="to-date" className="text-sm mb-1 cursor-pointer select-none w-full text-center group-hover:text-blue-700 transition">To</label>
          <div
            className="relative w-full flex justify-center items-center cursor-pointer"
            tabIndex={0}
            onClick={() => openDatePicker('to-date')}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openDatePicker('to-date'); }}
            role="button"
            aria-label="Select to date"
          >
            <input
              id="to-date"
              type="date"
              value={to}
              onChange={e => onChange(from, e.target.value)}
              className="border rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-center w-32 bg-white"
              style={{ zIndex: 1 }}
              readOnly
            />
            <span className="absolute right-2 cursor-pointer text-gray-400 material-symbols-outlined select-none group-hover:text-blue-700 transition" style={{zIndex:2}}>
              calendar_month
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getDayOfWeek(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'short' });
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
      <div className="relative w-full max-w-2xl bg-white/80 rounded-2xl shadow-xl border border-blue-100 p-3 sm:p-6 z-10 flex flex-col">
        <h1 className="text-3xl font-extrabold mb-4 text-center text-blue-700 tracking-tight drop-shadow">Hours</h1>
        <div className="mb-4 flex flex-col items-center justify-center">
          <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        </div>
        <div className="flex-1 min-h-0">
          <div className="overflow-x-auto overflow-y-auto max-h-[60vh] rounded-xl border shadow-sm bg-white/70">
            <table className="min-w-full text-sm text-center">
              <thead>
                <tr className="bg-blue-50 border-b">
                  {['Date', 'Day', 'Task', 'Hours', 'Sent', 'Action'].map(h => (
                    <th key={h} className="px-3 py-2 font-semibold text-blue-900/80 text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400 text-lg">No entries in this range.</td>
                  </tr>
                ) : (
                  filtered.map((entry, i) => {
                    const key = `${entry.taskId}|${entry.date}`;
                    return (
                      <tr key={i} className="border-t hover:bg-blue-50 transition-colors">
                        <td className="px-3 py-2 whitespace-nowrap text-center">{entry.date}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">{getDayOfWeek(entry.date)}</td>
                        <td className="px-3 py-2 font-mono text-blue-800/90 whitespace-nowrap text-center">{entry.taskId}</td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editedHours[key] !== undefined ? editedHours[key] : entry.hours}
                            onChange={e => setEditedHours({ ...editedHours, [key]: e.target.value })}
                            className="w-20 border rounded px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-300 transition bg-white"
                            disabled={entry.sentToJira}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">{entry.sentToJira ? <span className="text-green-600">✅</span> : <span className="text-red-400">❌</span>}</td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex justify-center items-center">
                            <button
                              className={`group relative flex items-center gap-2 px-4 py-2 rounded-full font-semibold shadow-md transition-all duration-150
                                ${entry.sentToJira
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-200'
                                  : 'bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 border border-blue-600 cursor-pointer'}
                              `}
                              disabled={entry.sentToJira}
                              onClick={() => handleSendToJira(entry)}
                              aria-label={entry.sentToJira ? 'Already sent to Jira' : 'Send to Jira'}
                            >
                              <span className="material-symbols-outlined text-lg pointer-events-none">
                                {entry.sentToJira ? 'check_circle' : 'send'}
                              </span>
                              <span>{entry.sentToJira ? 'Sent' : 'Send'}</span>
                              {!entry.sentToJira && (
                                <span className="absolute left-0 top-0 w-full h-full rounded-full opacity-0 group-hover:opacity-10 bg-white transition-opacity duration-200 pointer-events-none"></span>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
    </div>
  );
}

export default App;
