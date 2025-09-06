import { useEffect, useState } from 'react';
import { getJiraIssuesDetails } from '../services/JiraIntegration';
import { jiraHeadingsCache } from '../utils/cache';

export function useJiraHeadings(taskIds: string[]) {
  const [issueHeadings, setIssueHeadings] = useState<Record<string, string>>({});
  const [loadingHeadings, setLoadingHeadings] = useState<Record<string, boolean>>({});
  const [headingsError, setHeadingsError] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    if (taskIds.length === 0) {
      setIssueHeadings({});
      setLoadingHeadings({});
      setHeadingsError({});
      return;
    }

    // Check cache first
    const cachedHeadings: Record<string, string> = {};
    const uncachedIds: string[] = [];
    
    for (const id of taskIds) {
      const cached = jiraHeadingsCache.get(id);
      if (cached) {
        cachedHeadings[id] = cached;
      } else {
        uncachedIds.push(id);
      }
    }

    // Set cached data immediately
    if (Object.keys(cachedHeadings).length > 0) {
      setIssueHeadings(prev => ({ ...prev, ...cachedHeadings }));
    }

    // If all data is cached, we're done
    if (uncachedIds.length === 0) {
      setLoadingHeadings({});
      setHeadingsError({});
      return;
    }

    // Fetch only uncached data
    setLoadingHeadings(Object.fromEntries(uncachedIds.map(id => [id, true])));
    setHeadingsError({});
    
    getJiraIssuesDetails(uncachedIds)
      .then(issues => {
        if (cancelled) return;
        const headings: Record<string, string> = {};
        for (const issue of issues) {
          const heading = issue.fields?.summary || '(No summary)';
          headings[issue.key] = heading;
          // Cache the result
          jiraHeadingsCache.set(issue.key, heading);
        }
        setIssueHeadings(prev => ({ ...prev, ...headings }));
        setLoadingHeadings(Object.fromEntries(uncachedIds.map(id => [id, false])));
      })
      .catch(e => {
        if (cancelled) return;
        const errMsg = e?.message || 'Failed to fetch Jira headings';
        setHeadingsError(Object.fromEntries(uncachedIds.map(id => [id, errMsg])));
        setLoadingHeadings(Object.fromEntries(uncachedIds.map(id => [id, false])));
      });
    return () => { cancelled = true; };
  }, [taskIds]);

  return { issueHeadings, loadingHeadings, headingsError };
}
