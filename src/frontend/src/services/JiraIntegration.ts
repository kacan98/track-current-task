import type { LogEntry } from "../components/types";

const baseUrl = "http://localhost:9999";

// Get Jira PAT and cache in localStorage
export async function getAndCacheJiraToken(login: string, password: string, name: string = `Track current task`) {
  const res = await fetch(baseUrl + '/api/jira/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password, name })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to get Jira token');
  }
  const data = await res.json();
  if (data.rawToken) {
    localStorage.setItem('jiraToken', data.rawToken);
  }
  return data;
}

export function getCachedJiraToken() {
  return localStorage.getItem('jiraToken');
}

// Minimal implementation to restore Jira worklog functionality
export async function logWorkToJira(issueKey: string, timeSpentSeconds: number, started: string, comment: string = '') {
  const token = getCachedJiraToken();
  if (!token) throw new Error('No Jira token found. Please authenticate first.');
  const res = await fetch(baseUrl + '/api/jira/logwork', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      issueKey,
      timeSpentSeconds,
      started,
      comment,
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err?.missingFields) {
      throw new Error(`Missing required fields: ${err.missingFields.join(', ')}`);
    }
    throw new Error(err?.error || 'Failed to log work to Jira');
  }
  return await res.json();
}

// Fetch details for multiple Jira issues by their keys
export async function getJiraIssuesDetails(issueKeys: string[]): Promise<any[]> {
  const token = getCachedJiraToken();
  if (!token) throw new Error('No Jira token found. Please authenticate first.');
  const res = await fetch(baseUrl + '/api/jira/issues/details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      issueKeys
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to fetch Jira issue details');
  }
  const data = await res.json();
  return data.issues || [];
}

// Fetch details for multiple Jira worklogs by their IDs
export async function getJiraWorklogsDetails(worklogIds: number[]): Promise<any[]> {
  const token = getCachedJiraToken();
  if (!token) throw new Error('No Jira token found. Please authenticate first.');
  const res = await fetch(baseUrl + '/api/jira/worklogs/details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      worklogIds
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to fetch Jira worklog details');
  }
  const data = await res.json();
  return data.worklogs || [];
}
