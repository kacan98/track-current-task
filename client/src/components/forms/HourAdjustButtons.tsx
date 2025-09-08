import React from 'react';
import { Button } from '../ui/Button';

interface HourAdjustButtonsProps {
  value: string | number;
  onChange: (newValue: string) => void;
  disabled?: boolean;
  onDelete?: () => void;
}

export const HourAdjustButtons: React.FC<HourAdjustButtonsProps> = ({ value, onChange, disabled, onDelete }) => {
  const getCurrent = () => (typeof value === 'number' ? value : parseFloat(value));
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-0 justify-center">
        <Button
          type="button"
          variant="secondary"
          className="w-6 h-6 p-0 flex items-center justify-center text-sm"
          disabled={disabled}
          onClick={() => onChange(Math.max(0, getCurrent() - 1).toString())}
          title="Subtract 1 hour"
        >
          −
        </Button>
        
        <input
          type="number"
          min="0"
          step="0.5"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-12 border border-gray-200 rounded px-1 py-0.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-400"
          disabled={disabled}
        />
        
        <Button
          type="button"
          variant="secondary"
          className="w-6 h-6 p-0 flex items-center justify-center text-sm"
          disabled={disabled}
          onClick={() => onChange((getCurrent() + 1).toString())}
          title="Add 1 hour"
        >
          +
        </Button>
      </div>

      {onDelete && (
        <Button
          type="button"
          variant="secondary"
          className="w-6 h-6 p-0 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-100"
          disabled={disabled}
          onClick={onDelete}
          title="Delete entry"
        >
          <span className="material-symbols-outlined text-sm">delete</span>
        </Button>
      )}
    </div>
  );
};