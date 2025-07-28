import { Button } from './Button';

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
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
          <Button
            key={range}
            variant="compact"
            className="px-3 py-1 rounded-full font-semibold border"
            onClick={() => { const r = getQuickRange(range as any); onChange(r.from, r.to); }}
          >
            {label}
          </Button>
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
