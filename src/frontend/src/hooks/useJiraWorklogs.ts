import { useState, useEffect } from 'react';
import { getCachedJiraToken } from '../services/JiraIntegration';
import type { LogEntry } from '../components/types';

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
    Promise.all(
      dfoTaskIds.map(async taskId => {
        try {
          const res = await fetch(`http://localhost:9999/api/jira/issues/details`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: getCachedJiraToken(), issueKeys: [taskId], fields: ['worklog'] })
          });
          if (!res.ok) throw new Error('Failed to fetch worklogs');
          const data = await res.json();
          const worklogs = data.issues?.[0]?.fields?.worklog?.worklogs || [];
          if (!Array.isArray(worklogs) || worklogs.length === 0) return { taskId, worklogs: [] };
          return { taskId, worklogs };
        } catch (e: any) {
          return { taskId, worklogs: [], error: e?.message || 'Failed to fetch worklogs' };
        }
      })
    ).then(async results => {
      if (cancelled) return;
      const allWorklogs = results.flatMap(r =>
        (r.worklogs || []).map((w: any) => ({
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
  }, [entries]);

  return { worklogTotals, loadingWorklogs, worklogError };
}
