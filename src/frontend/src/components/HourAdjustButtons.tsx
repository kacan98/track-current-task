import React from 'react';
import { Button } from './Button';

interface HourAdjustButtonsProps {
  value: string | number;
  onChange: (newValue: string) => void;
  disabled?: boolean;
}

export const HourAdjustButtons: React.FC<HourAdjustButtonsProps> = ({ value, onChange, disabled }) => {
  const getCurrent = () => (typeof value === 'number' ? value : parseFloat(value));
  return (
    <div className="flex items-center gap-1 justify-center h-full w-full min-w-0">
      <Button
        type="button"
        variant="secondary"
        className="px-2 py-1 h-full flex-1 min-w-0 text-xs"
        style={{ minWidth: '2.5rem' }}
        disabled={disabled}
        onClick={() => onChange(Math.max(0, getCurrent() - 2).toString())}
        title="Subtract 2 hours"
      >
        -2h
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="px-2 py-1 h-full flex-1 min-w-0 text-xs"
        style={{ minWidth: '2.5rem' }}
        disabled={disabled}
        onClick={() => onChange(Math.max(0, getCurrent() - 1).toString())}
        title="Subtract 1 hour"
      >
        -1h
      </Button>
      <input
        type="number"
        min="0"
        step="0.5"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition bg-white h-full flex-shrink min-w-0 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
        disabled={disabled}
        style={{ minWidth: '4rem' }}
      />
      <Button
        type="button"
        variant="secondary"
        className="px-2 py-1 h-full flex-1 min-w-0 text-xs"
        style={{ minWidth: '2.5rem' }}
        disabled={disabled}
        onClick={() => onChange((getCurrent() + 1).toString())}
        title="Add 1 hour"
      >
        +1h
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="px-2 py-1 h-full flex-1 min-w-0 text-xs"
        style={{ minWidth: '2.5rem' }}
        disabled={disabled}
        onClick={() => onChange((getCurrent() + 2).toString())}
        title="Add 2 hours"
      >
        +2h
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="ml-1 px-2 py-1 h-full flex-1 min-w-0 text-xs"
        style={{ minWidth: '2.5rem' }}
        disabled={disabled}
        onClick={() => onChange('7.5')}
        title="Set to whole day (7.5 hours)"
      >
        whole day
      </Button>
    </div>
  );
};