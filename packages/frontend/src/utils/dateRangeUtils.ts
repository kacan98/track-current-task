// Single source of truth for all date range calculations

export type DateRangePreset = 'thisWeek' | 'last5Weeks' | 'last52Weeks';

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

// Get start of week based on user preference (0=Sunday, 1=Monday)
export function getStartOfWeek(date: Date, weekStartDay: number): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const daysBack = (dayOfWeek + 7 - weekStartDay) % 7;
  d.setDate(d.getDate() - daysBack);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Format date as YYYY-MM-DD
export function formatDate(date: Date): string {
  return date.getFullYear() + '-' + 
         (date.getMonth() + 1).toString().padStart(2, '0') + '-' + 
         date.getDate().toString().padStart(2, '0');
}

// Get date range for a preset (THIS IS THE SINGLE SOURCE OF TRUTH)
export function getDateRangeForPreset(preset: DateRangePreset, weekStartDay: number): DateRange {
  const today = new Date();
  
  switch (preset) {
    case 'thisWeek': {
      // This week: start of current week to end of current week
      const startOfCurrentWeek = getStartOfWeek(today, weekStartDay);
      const endOfCurrentWeek = new Date(startOfCurrentWeek);
      endOfCurrentWeek.setDate(endOfCurrentWeek.getDate() + 6); // 7 days total
      return { 
        from: formatDate(startOfCurrentWeek), 
        to: formatDate(endOfCurrentWeek) 
      };
    }
    
    case 'last5Weeks': {
      // Last 5 weeks: 5 complete weeks ending with current week
      const startOfCurrentWeek = getStartOfWeek(today, weekStartDay);
      const endOfCurrentWeek = new Date(startOfCurrentWeek);
      endOfCurrentWeek.setDate(endOfCurrentWeek.getDate() + 6); // End of current week
      
      // Go back 4 more weeks from start of current week (5 weeks total)
      const startOfRange = new Date(startOfCurrentWeek);
      startOfRange.setDate(startOfRange.getDate() - (4 * 7));
      
      return { 
        from: formatDate(startOfRange), 
        to: formatDate(endOfCurrentWeek) 
      };
    }
    
    case 'last52Weeks': {
      // Last 52 weeks: 52 complete weeks ending with current week
      const startOfCurrentWeek = getStartOfWeek(today, weekStartDay);
      const endOfCurrentWeek = new Date(startOfCurrentWeek);
      endOfCurrentWeek.setDate(endOfCurrentWeek.getDate() + 6); // End of current week
      
      // Go back 51 more weeks from start of current week (52 weeks total)
      const startOfRange = new Date(startOfCurrentWeek);
      startOfRange.setDate(startOfRange.getDate() - (51 * 7));
      
      return { 
        from: formatDate(startOfRange), 
        to: formatDate(endOfCurrentWeek) 
      };
    }
    
    default:
      throw new Error(`Unknown preset: ${preset}`);
  }
}

// Check which preset matches the given date range (if any)
export function getPresetForDateRange(from: string, to: string, weekStartDay: number): DateRangePreset | null {
  const presets: DateRangePreset[] = ['thisWeek', 'last5Weeks', 'last52Weeks'];
  
  for (const preset of presets) {
    const range = getDateRangeForPreset(preset, weekStartDay);
    if (range.from === from && range.to === to) {
      return preset;
    }
  }
  
  return null; // Custom range
}

// Default preset to use on app load
export const DEFAULT_PRESET: DateRangePreset = 'last5Weeks';