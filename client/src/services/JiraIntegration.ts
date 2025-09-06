import { api } from './apiClient';
import { handleApiResponse } from '../utils/errorUtils';

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
export async function loginToJira(login: string, password: string, jiraUrl: string, name: string = `LogBridge`) {
  const res = await api.jira.login(login, password, jiraUrl, name);
  return handleApiResponse(res, 'Failed to authenticate with Jira');
}

// Login with API token and store encrypted token in httpOnly cookie
export async function loginToJiraWithToken(token: string, jiraUrl: string, name: string = `LogBridge`) {
  const res = await api.jira.loginWithToken(token, jiraUrl, name);
  return handleApiResponse(res, 'Failed to authenticate with Jira using API token');
}

// Check authentication status
export async function getAuthStatus() {
  const res = await api.jira.getStatus();
  return handleApiResponse(res, 'Failed to check authentication status');
}

// Logout and clear encrypted cookie
export async function logoutFromJira() {
  const res = await api.jira.logout();
  return handleApiResponse(res, 'Failed to logout');
}

// Log work to Jira using encrypted cookie authentication
export async function logWorkToJira(issueKey: string, timeSpentSeconds: number, started: string, comment: string = '') {
  const res = await api.jira.logWork(issueKey, timeSpentSeconds, started, comment);
  return handleApiResponse(res, 'Failed to log work to Jira');
}

// Fetch details for multiple Jira issues by their keys
export async function getJiraIssuesDetails(issueKeys: string[]): Promise<JiraIssue[]> {
  const res = await api.jira.getIssuesDetails(issueKeys);
  const data = await handleApiResponse(res, 'Failed to fetch Jira issue details');
  return data.issues || [];
}

// Fetch details for multiple Jira worklogs by their IDs
export async function getJiraWorklogsDetails(worklogIds: number[]): Promise<JiraWorklog[]> {
  const res = await api.jira.getWorklogsDetails(worklogIds);
  const data = await handleApiResponse(res, 'Failed to fetch Jira worklog details');
  return data.worklogs || [];
}
