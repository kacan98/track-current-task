import { useEffect } from 'react';
import { Button } from '../ui/Button';
import { useSettings } from '../../contexts/SettingsContext';
import { getDateRangeForPreset, getPresetForDateRange, type DateRangePreset } from '../../utils/dateRangeUtils';

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const { getSetting } = useSettings();
  const weekStartDay = parseInt(getSetting('weekStartDay') || '1'); // Default to Monday (1)
  
  
  // Effect to recalculate when weekStartDay changes
  useEffect(() => {
    const currentPreset = getPresetForDateRange(from, to, weekStartDay);
    if (currentPreset) {
      // Recalculate the currently selected preset with new weekStartDay
      const range = getDateRangeForPreset(currentPreset, weekStartDay);
      onChange(range.from, range.to);
    }
  }, [weekStartDay, from, to, onChange]);
  
  // Check if button is selected
  const isSelected = (preset: DateRangePreset): boolean => {
    const range = getDateRangeForPreset(preset, weekStartDay);
    return range.from === from && range.to === to;
  };
  
  // Handle button click
  const handlePresetClick = (preset: DateRangePreset) => {
    const range = getDateRangeForPreset(preset, weekStartDay);
    onChange(range.from, range.to);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={isSelected('thisWeek') ? "primary" : "secondary"}
          onClick={() => handlePresetClick('thisWeek')}
        >
          This Week
        </Button>
        <Button
          variant={isSelected('last5Weeks') ? "primary" : "secondary"}
          onClick={() => handlePresetClick('last5Weeks')}
        >
          Last 5 Weeks
        </Button>
        <Button
          variant={isSelected('last52Weeks') ? "primary" : "secondary"}
          onClick={() => handlePresetClick('last52Weeks')}
        >
          Last 52 Weeks
        </Button>
      </div>
    </div>
  );
}