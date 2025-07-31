import { useEffect, useState } from 'react';
import { getJiraIssuesDetails } from '../services/JiraIntegration';

export function useJiraHeadings(dfoTaskIds: string[]) {
  const [issueHeadings, setIssueHeadings] = useState<Record<string, string>>({});
  const [loadingHeadings, setLoadingHeadings] = useState<Record<string, boolean>>({});
  const [headingsError, setHeadingsError] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    if (dfoTaskIds.length === 0) {
      setIssueHeadings({});
      setLoadingHeadings({});
      setHeadingsError({});
      return;
    }
    setLoadingHeadings(Object.fromEntries(dfoTaskIds.map(id => [id, true])));
    setHeadingsError({});
    getJiraIssuesDetails(dfoTaskIds)
      .then(issues => {
        if (cancelled) return;
        const headings: Record<string, string> = {};
        for (const issue of issues) {
          headings[issue.key] = issue.fields?.summary || '(No summary)';
        }
        setIssueHeadings(headings);
        setLoadingHeadings(Object.fromEntries(dfoTaskIds.map(id => [id, false])));
      })
      .catch(e => {
        if (cancelled) return;
        const errMsg = e?.message || 'Failed to fetch Jira headings';
        setHeadingsError(Object.fromEntries(dfoTaskIds.map(id => [id, errMsg])));
        setLoadingHeadings(Object.fromEntries(dfoTaskIds.map(id => [id, false])));
      });
    return () => { cancelled = true; };
  }, [dfoTaskIds.join(',')]);

  return { issueHeadings, loadingHeadings, headingsError };
}
