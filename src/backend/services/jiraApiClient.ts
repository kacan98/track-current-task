import axios, { AxiosResponse } from 'axios';
import type { 
  JiraLogWorkRequest, 
  JiraLogWorkQueryParams, 
  JiraLogWorkPayload,
  JiraIssuesRequest, 
  JiraWorklogsRequest 
} from '../types/jira';

// Base Jira configuration
const JIRA_BASE_URL = 'https://jira.eg.dk';
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
  async logWork(token: string, request: JiraLogWorkRequest): Promise<AxiosResponse> {
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

    const url = `${JIRA_BASE_URL}/rest/api/${API_VERSION}/issue/${issueKey}/worklog`;
    const config = {
      ...createAxiosConfig(token),
      params: queryParams,
    };

    return axios.post(url, payload, config);
  },

  // Get details for multiple issues
  async getIssuesDetails(token: string, request: JiraIssuesRequest): Promise<AxiosResponse> {
    const { issueKeys, jql, fields } = request;
    
    const url = `${JIRA_BASE_URL}/rest/api/${API_VERSION}/search`;
    const jqlQuery = jql || `issuekey in (${issueKeys.map(key => `'${key}'`).join(',')})`;
    
    const payload = {
      jql: jqlQuery,
      fields: fields || ['summary', 'description', 'status', 'assignee', 'reporter', 'priority']
    };

    return axios.post(url, payload, createAxiosConfig(token));
  },

  // Get details for multiple worklogs
  async getWorklogsDetails(token: string, request: JiraWorklogsRequest): Promise<AxiosResponse> {
    const { worklogIds } = request;
    
    const url = `${JIRA_BASE_URL}/rest/api/${API_VERSION}/worklog/list`;
    const payload = { ids: worklogIds };

    return axios.post(url, payload, createAxiosConfig(token));
  }
};