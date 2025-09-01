import { useState, useEffect } from 'react';
import { getJiraIssuesDetails } from '../services/JiraIntegration';
import type { LogEntry } from '@/types';
import { jiraWorklogsCache } from '../utils/cache';

export function useJiraWorklogs(entries: LogEntry[], dfoTaskIds: string[]) {
  const [worklogTotals, setWorklogTotals] = useState<Record<string, number>>({});
  const [loadingWorklogs, setLoadingWorklogs] = useState<Record<string, boolean>>({});
  const [worklogError, setWorklogError] = useState<Record<string, string>>({});


  useEffect(() => {
    let cancelled = false;
    const pairs = entries
      .filter(e => /^DFO-\d+$/.test(e.taskId))
      .map(e => ({ taskId: e.taskId, date: e.date }));
    const uniquePairs = Array.from(new Set(pairs.map(p => `${p.taskId}|${p.date}`)))
      .map(k => {
        const [taskId, date] = k.split('|');
        return { taskId, date };
      });
    if (uniquePairs.length === 0) {
      setWorklogTotals({});
      setLoadingWorklogs({});
      setWorklogError({});
      return;
    }
    setLoadingWorklogs(Object.fromEntries(uniquePairs.map(({taskId, date}) => [`${taskId}|${date}`, true])));
    setWorklogError({});
    // Check cache and only fetch uncached tasks
    const uncachedTaskIds: string[] = [];
    const cachedResults: { taskId: string; worklogs: unknown[] }[] = [];
    
    for (const taskId of dfoTaskIds) {
      const cached = jiraWorklogsCache.get(taskId);
      if (cached) {
        cachedResults.push({ taskId, worklogs: Array.isArray(cached) ? cached : [] });
      } else {
        uncachedTaskIds.push(taskId);
      }
    }

    Promise.all([
      // Return cached results immediately
      ...cachedResults.map(r => Promise.resolve(r)),
      // Fetch uncached data
      ...uncachedTaskIds.map(async taskId => {
        try {
          const data = await getJiraIssuesDetails([taskId]);
          const worklogSection = data[0]?.fields?.worklog;
          const worklogData = worklogSection && typeof worklogSection === 'object' && 'worklogs' in worklogSection 
            ? worklogSection.worklogs 
            : undefined;
          const worklogs = Array.isArray(worklogData) ? worklogData : [];
          // Cache the result
          jiraWorklogsCache.set(taskId, worklogs);
          if (!Array.isArray(worklogs) || worklogs.length === 0) return { taskId, worklogs: [] };
          return { taskId, worklogs };
        } catch (e: unknown) {
          return { taskId, worklogs: [], error: e instanceof Error ? e.message : 'Failed to fetch worklogs' };
        }
      })
    ]).then(async results => {
      if (cancelled) return;
      const allWorklogs = results.flatMap(r =>
        (Array.isArray(r.worklogs) ? r.worklogs : []).map((w: { started: string; timeSpentSeconds: number }) => ({
          taskId: r.taskId,
          started: w.started,
          timeSpentSeconds: w.timeSpentSeconds
        }))
      );
      const totals: Record<string, number> = {};
      for (const { taskId, date } of uniquePairs) {
        const total = allWorklogs
          .filter(w => w.taskId === taskId && w.started && w.started.startsWith(date))
          .reduce((sum, w) => sum + (w.timeSpentSeconds || 0), 0);
        totals[`${taskId}|${date}`] = total;
      }
      setWorklogTotals(totals);
      setLoadingWorklogs(Object.fromEntries(uniquePairs.map(({taskId, date}) => [`${taskId}|${date}`, false])));
    });
    return () => { cancelled = true; };
  }, [entries, dfoTaskIds]);

  return { worklogTotals, loadingWorklogs, worklogError };
}
