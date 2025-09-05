import { api } from './apiClient';

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    [key: string]: unknown;
  };
}

interface JiraWorklog {
  id: number;
  timeSpentSeconds: number;
  started: string;
  [key: string]: unknown;
}

// Login and store encrypted token in httpOnly cookie
export async function loginToJira(login: string, password: string, name: string = `Track current task`) {
  const res = await api.jira.login(login, password, name);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to authenticate with Jira');
  }
  return await res.json();
}

// Check authentication status
export async function getAuthStatus() {
  const res = await api.jira.getStatus();
  if (!res.ok) {
    throw new Error('Failed to check authentication status');
  }
  return await res.json();
}

// Logout and clear encrypted cookie
export async function logoutFromJira() {
  const res = await api.jira.logout();
  if (!res.ok) {
    throw new Error('Failed to logout');
  }
  return await res.json();
}

// Log work to Jira using encrypted cookie authentication
export async function logWorkToJira(issueKey: string, timeSpentSeconds: number, started: string, comment: string = '') {
  const res = await api.jira.logWork(issueKey, timeSpentSeconds, started, comment);

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
export async function getJiraIssuesDetails(issueKeys: string[]): Promise<JiraIssue[]> {
  const res = await api.jira.getIssuesDetails(issueKeys);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to fetch Jira issue details');
  }
  const data = await res.json();
  return data.issues || [];
}

// Fetch details for multiple Jira worklogs by their IDs
export async function getJiraWorklogsDetails(worklogIds: number[]): Promise<JiraWorklog[]> {
  const res = await api.jira.getWorklogsDetails(worklogIds);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to fetch Jira worklog details');
  }
  const data = await res.json();
  return data.worklogs || [];
}
