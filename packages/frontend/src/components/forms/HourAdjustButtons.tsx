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
    <div className="flex items-center gap-1 justify-center">
      <Button
        type="button"
        variant="secondary"
        className="p-1 text-xs"
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
        className="w-14 border border-gray-200 rounded px-1 py-0.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-400"
        disabled={disabled}
      />
      
      <Button
        type="button"
        variant="secondary"
        className="p-1 text-xs"
        disabled={disabled}
        onClick={() => onChange((getCurrent() + 1).toString())}
        title="Add 1 hour"
      >
        +1h
      </Button>
    </div>
  );
};