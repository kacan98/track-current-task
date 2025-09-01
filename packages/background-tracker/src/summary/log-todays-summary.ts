import { getLogEntries } from '../core/file-operations';
import { formatLocalDateTime } from '../utils/date-utils';
import { logger } from '../../../../shared/logger';

/**
 * Get and display today's summary of logged hours
 * @returns The total hours logged today
 */
export async function logTodaySummary(): Promise<number> {
  const entries = await getLogEntries();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Filter entries for today
  const todayEntries = entries.filter(entry => entry.date === today);

  if (todayEntries.length === 0) {
    logger.info(`\n\n[${formatLocalDateTime()}] Today's Summary: No time logged yet today.\n\n`);
    return 0;
  }
  
  // Group by task ID and repository, sum hours
  const taskSummary: Record<string, { hours: number; repository: string }> = {};
  let totalHours = 0;
  
  todayEntries.forEach(entry => {
    const key = `${entry.taskId}|${entry.repository}`;
    if (!taskSummary[key]) {
      taskSummary[key] = { hours: 0, repository: entry.repository };
    }
    taskSummary[key].hours += entry.hours;
    totalHours += entry.hours;
  });
  
  // Display summary
  logger.info(`\n\n[${formatLocalDateTime()}] Today's Summary:`);
    Object.entries(taskSummary)
    .sort(([, dataA], [, dataB]) => dataB.hours - dataA.hours) // Sort by hours descending
    .forEach(([key, data]) => {
      const [taskId] = key.split('|');
      
      logger.info(`  • ${taskId} (${data.repository}): ${data.hours.toFixed(2)} hours`);
    });
    logger.info(`  Total: ${totalHours.toFixed(2)} hours\n\n`);
  
  return totalHours;
}
