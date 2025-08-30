import React from 'react';
import { Button } from '../ui/Button';

interface HourAdjustButtonsProps {
  value: string | number;
  onChange: (newValue: string) => void;
  disabled?: boolean;
}

export const HourAdjustButtons: React.FC<HourAdjustButtonsProps> = ({ value, onChange, disabled }) => {
  const getCurrent = () => (typeof value === 'number' ? value : parseFloat(value));
  return (
    <>
      {/* Desktop layout: horizontal (≥640px) */}
      <div className="hidden sm:flex items-center gap-1 justify-center h-full w-full min-w-0">
        {/* Desktop: Show all buttons (≥1024px) */}
        <Button
          type="button"
          variant="secondary"
          className="hidden lg:flex px-2 py-1 h-full flex-1 min-w-0 text-xs"
          style={{ minWidth: '2.5rem' }}
          disabled={disabled}
          onClick={() => onChange(Math.max(0, getCurrent() - 2).toString())}
          title="Subtract 2 hours"
        >
          -2h
        </Button>
        
        {/* Tablet and up: Show ±1h buttons (≥640px) */}
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
        
        {/* Desktop: Show all buttons (≥1024px) */}
        <Button
          type="button"
          variant="secondary"
          className="hidden lg:flex px-2 py-1 h-full flex-1 min-w-0 text-xs"
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

      {/* Mobile layout: vertical stack (<640px) */}
      <div className="sm:hidden flex flex-col items-center gap-1 w-full min-w-0">
        {/* Top row: decrease buttons */}
        <div className="flex gap-1 justify-center">
          <Button
            type="button"
            variant="secondary"
            className="px-2 py-1 text-xs"
            style={{ minWidth: '2rem' }}
            disabled={disabled}
            onClick={() => onChange(Math.max(0, getCurrent() - 1).toString())}
            title="Subtract 1 hour"
          >
            -1h
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-2 py-1 text-xs"
            style={{ minWidth: '2rem' }}
            disabled={disabled}
            onClick={() => onChange(Math.max(0, getCurrent() - 0.5).toString())}
            title="Subtract 0.5 hours"
          >
            -0.5h
          </Button>
        </div>
        
        {/* Middle: input field */}
        <input
          type="number"
          min="0"
          step="0.5"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
          disabled={disabled}
        />
        
        {/* Bottom row: increase buttons + whole day */}
        <div className="flex gap-1 justify-center">
          <Button
            type="button"
            variant="secondary"
            className="px-2 py-1 text-xs"
            style={{ minWidth: '2rem' }}
            disabled={disabled}
            onClick={() => onChange((getCurrent() + 0.5).toString())}
            title="Add 0.5 hours"
          >
            +0.5h
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-2 py-1 text-xs"
            style={{ minWidth: '2rem' }}
            disabled={disabled}
            onClick={() => onChange((getCurrent() + 1).toString())}
            title="Add 1 hour"
          >
            +1h
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-2 py-1 text-xs"
            style={{ minWidth: '2rem' }}
            disabled={disabled}
            onClick={() => onChange('7.5')}
            title="Set to whole day (7.5 hours)"
          >
            7.5h
          </Button>
        </div>
      </div>
    </>
  );
};