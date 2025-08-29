import type { LogEntry } from "../components/types";
import { API_ROUTES } from "../../../shared/apiRoutes";

const baseUrl = "http://localhost:9999";

// Login and store encrypted token in httpOnly cookie
export async function loginToJira(login: string, password: string, name: string = `Track current task`) {
  const res = await fetch(baseUrl + '/api' + API_ROUTES.JIRA.AUTH.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ login, password, name })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to authenticate with Jira');
  }
  return await res.json();
}

// Check authentication status
export async function getAuthStatus() {
  const res = await fetch(baseUrl + '/api' + API_ROUTES.JIRA.AUTH.STATUS, {
    method: 'GET',
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error('Failed to check authentication status');
  }
  return await res.json();
}

// Logout and clear encrypted cookie
export async function logoutFromJira() {
  const res = await fetch(baseUrl + '/api' + API_ROUTES.JIRA.AUTH.LOGOUT, {
    method: 'POST',
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error('Failed to logout');
  }
  return await res.json();
}

// Log work to Jira using encrypted cookie authentication
export async function logWorkToJira(issueKey: string, timeSpentSeconds: number, started: string, comment: string = '') {
  const res = await fetch(baseUrl + '/api' + API_ROUTES.JIRA.LOGWORK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
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
  const res = await fetch(baseUrl + '/api' + API_ROUTES.JIRA.ISSUES_DETAILS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
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
  const res = await fetch(baseUrl + '/api' + API_ROUTES.JIRA.WORKLOGS_DETAILS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
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
