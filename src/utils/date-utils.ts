// Helper function to format date/time in local timezone with prettier formatting
export function formatLocalDateTime(date: Date = new Date()): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

// Helper function to format just the date in local timezone
export function formatLocalDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function extractTaskId(branchName: string, pattern?: string): string | null {
  // Default pattern is DFO-\d+, but can be customized through config
  const taskPattern = pattern || 'DFO-\\d+';
  const regex = new RegExp(taskPattern, 'i');
  const match = branchName.match(regex);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Generate a clickable URL for a task ID if taskTrackingUrl is configured
 */
export function generateTaskUrl(taskId: string, baseUrl?: string): string | null {
  if (!baseUrl || !taskId) {
    return null;
  }
  
  // Ensure baseUrl ends with a slash or is ready for concatenation
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  return cleanBaseUrl + taskId;
}

/**
 * Format hours as "Xh Ym"
 */
export function getFormattedHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
}

/**
 * Get first and last day of a month as formatted strings
 * @returns Object containing firstDay and lastDayStr as formatted date strings
 */
export function getMonthDateRange(year: number, month: number): { firstDay: string; lastDayStr: string } {
  // First day of month
  const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  
  // Last day of month (get first day of next month, then subtract one day)
  const lastDay = new Date(year, month + 1, 0);
  const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  
  return { firstDay, lastDayStr };
}

/**
 * Format date range for week display
 */
export function getFormattedWeekRange(weekStart: Date, weekEnd: Date): string {
  const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });  return `${startStr} - ${endStr}`;
}
