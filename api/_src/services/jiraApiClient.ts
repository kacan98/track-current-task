import axios, { AxiosResponse } from 'axios';
import type { 
  JiraLogWorkRequest, 
  JiraLogWorkQueryParams, 
  JiraLogWorkPayload,
  JiraIssuesRequest, 
  JiraWorklogsRequest 
} from '../types/jira';

// Base Jira configuration
const API_VERSION = '2';

// Helper to create axios config with authentication
function createAxiosConfig(token: string) {
  return {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
}

export const jiraApiClient = {
  // Log work to a Jira issue
  async logWork(token: string, jiraUrl: string, request: JiraLogWorkRequest): Promise<AxiosResponse> {
    const { 
      issueKey, 
      timeSpentSeconds, 
      started, 
      comment,
      visibility,
      notifyUsers,
      adjustEstimate,
      newEstimate,
      reduceBy,
      expand,
      overrideEditableFlag
    } = request;

    // Build query parameters
    const queryParams: JiraLogWorkQueryParams = {};
    if (notifyUsers !== undefined) queryParams.notifyUsers = notifyUsers;
    if (adjustEstimate !== undefined) queryParams.adjustEstimate = adjustEstimate;
    if (newEstimate !== undefined) queryParams.newEstimate = newEstimate;
    if (reduceBy !== undefined) queryParams.reduceBy = reduceBy;
    if (expand !== undefined) queryParams.expand = expand;
    if (overrideEditableFlag !== undefined) queryParams.overrideEditableFlag = overrideEditableFlag;

    // Build request payload
    const payload: JiraLogWorkPayload = {
      comment: comment || '',
      started,
      timeSpentSeconds,
    };
    if (visibility) payload.visibility = visibility;

    const url = `${jiraUrl}/rest/api/${API_VERSION}/issue/${issueKey}/worklog`;
    const config = {
      ...createAxiosConfig(token),
      params: queryParams,
    };

    return axios.post(url, payload, config);
  },

  // Get details for multiple issues
  async getIssuesDetails(token: string, jiraUrl: string, request: JiraIssuesRequest): Promise<AxiosResponse> {
    const { issueKeys, jql, fields } = request;
    
    const url = `${jiraUrl}/rest/api/${API_VERSION}/search`;
    const jqlQuery = jql || `issuekey in (${issueKeys.map(key => `'${key}'`).join(',')})`;
    
    const payload = {
      jql: jqlQuery,
      fields: fields || ['summary', 'description', 'status', 'assignee', 'reporter', 'priority']
    };

    return axios.post(url, payload, createAxiosConfig(token));
  },

  // Get details for multiple worklogs
  async getWorklogsDetails(token: string, jiraUrl: string, request: JiraWorklogsRequest): Promise<AxiosResponse> {
    const { worklogIds } = request;

    const url = `${jiraUrl}/rest/api/${API_VERSION}/worklog/list`;
    const payload = { ids: worklogIds };

    return axios.post(url, payload, createAxiosConfig(token));
  },

  // Get assigned tasks filtered by status category
  async getAssignedTasks(token: string, jiraUrl: string, statusCategories: string[] = ['To Do', 'In Progress'], maxResults: number = 50): Promise<AxiosResponse> {
    const url = `${jiraUrl}/rest/api/${API_VERSION}/search`;

    const statusCategoryFilter = statusCategories.map(cat => `"${cat}"`).join(', ');

    // Filter by current user's assigned tasks, excluding subtasks
    const jqlQuery = `assignee = currentUser() AND statusCategory IN (${statusCategoryFilter}) AND issuetype != Sub-task ORDER BY updated DESC`;

    const payload = {
      jql: jqlQuery,
      maxResults,
      fields: ['summary', 'status', 'priority', 'issuetype', 'key', 'project', 'assignee', 'issuelinks', 'subtasks']
    };

    return axios.post(url, payload, createAxiosConfig(token));
  }
};