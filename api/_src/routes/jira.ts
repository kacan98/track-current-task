import { Router, Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { getJiraToken } from '../services/jiraService';
import { isProduction } from '../config/cors';
import { createLogger } from '../../../shared/logger';
import { jiraApiClient } from '../services/jiraApiClient';
import axios, { AxiosError } from 'axios';
import type {
  JiraAuthRequest,
  JiraTokenAuthRequest,
  JiraLogWorkRequest,
  JiraIssuesRequest,
  JiraWorklogsRequest
} from '../types/jira';

const router = Router();
const jiraLogger = createLogger('JIRA');
const API_VERSION = '2';

// Helper to validate and extract Jira credentials from cookies
function getJiraCredentialsFromCookies(req: Request): { token: string, jiraUrl: string } {
  const token = req.signedCookies?.jiraToken;
  let jiraUrl = req.signedCookies?.jiraUrl;
  if (!token || !jiraUrl) {
    throw new ApiError(401, 'Not authenticated. Please log in first.', 'AUTH_REQUIRED');
  }
  // Safety: normalize URL from cookies (in case old cookies have trailing slashes)
  jiraUrl = normalizeJiraUrl(jiraUrl);
  return { token, jiraUrl };
}

// Helper to normalize Jira URL (remove trailing slash)
function normalizeJiraUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

// Authentication endpoints
router.post('/auth/login', asyncHandler(async (req: Request, res: Response) => {
  let { login, password, jiraUrl, name }: JiraAuthRequest = req.body;

  if (!login || !password || !jiraUrl) {
    throw new ApiError(400, 'Missing login, password, or Jira URL', 'AUTH_MISSING_CREDENTIALS');
  }

  // Normalize URL (remove trailing slashes)
  jiraUrl = normalizeJiraUrl(jiraUrl);

  jiraLogger.info('Authentication attempt');
  const tokenData = await getJiraToken(login, password, jiraUrl, name);

  // Store token and URL in encrypted cookies with environment-aware settings
  const jiraToken = tokenData.rawToken;
  res.cookie('jiraToken', jiraToken, {
    signed: true,        // Encrypt the cookie
    httpOnly: true,      // Prevent XSS
    secure: isProduction, // HTTPS only in production
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    sameSite: isProduction ? 'strict' : 'lax' // Stricter CSRF in prod
  });
  
  res.cookie('jiraUrl', jiraUrl, {
    signed: true,        // Encrypt the cookie
    httpOnly: true,      // Prevent XSS
    secure: isProduction, // HTTPS only in production
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    sameSite: isProduction ? 'strict' : 'lax' // Stricter CSRF in prod
  });
  
  jiraLogger.success('Authentication successful');
  res.json({ 
    success: true, 
    message: 'Successfully authenticated with Jira',
    hasFilesystemAccess: process.env.DEV === 'true'
  });
}));

// Authentication endpoint for API token
router.post('/auth/login-token', asyncHandler(async (req: Request, res: Response) => {
  let { token, jiraUrl, name }: JiraTokenAuthRequest = req.body;

  if (!token || !jiraUrl) {
    throw new ApiError(400, 'Missing API token or Jira URL', 'AUTH_MISSING_TOKEN');
  }

  // Normalize URL (remove trailing slashes)
  jiraUrl = normalizeJiraUrl(jiraUrl);

  jiraLogger.info('API Token authentication attempt');

  // Store token and URL directly in encrypted cookies (token is already valid)
  res.cookie('jiraToken', token, {
    signed: true,        // Encrypt the cookie
    httpOnly: true,      // Prevent XSS
    secure: isProduction, // HTTPS only in production
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    sameSite: isProduction ? 'strict' : 'lax' // Stricter CSRF in prod
  });
  
  res.cookie('jiraUrl', jiraUrl, {
    signed: true,        // Encrypt the cookie
    httpOnly: true,      // Prevent XSS
    secure: isProduction, // HTTPS only in production
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    sameSite: isProduction ? 'strict' : 'lax' // Stricter CSRF in prod
  });
  
  jiraLogger.success('Token authentication successful');
  res.json({ 
    success: true, 
    message: 'Successfully authenticated with Jira API token',
    hasFilesystemAccess: process.env.DEV === 'true'
  });
}));

router.post('/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('jiraToken');
  res.clearCookie('jiraUrl');
  jiraLogger.info('User logged out');
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/auth/status', (req: Request, res: Response) => {
  const jiraToken = req.signedCookies.jiraToken;
  res.json({ 
    authenticated: !!jiraToken,
    hasFilesystemAccess: process.env.DEV === 'true'
  });
});

// Proxy endpoint for logging work
router.post('/logwork', asyncHandler(async (req: Request, res: Response) => {
  const { token, jiraUrl } = getJiraCredentialsFromCookies(req);
  const requestData: JiraLogWorkRequest = req.body;
  
  // Validate required fields
  const missingFields: string[] = [];
  if (!requestData.issueKey) missingFields.push('issueKey');
  if (typeof requestData.timeSpentSeconds !== 'number' || isNaN(requestData.timeSpentSeconds)) {
    missingFields.push('timeSpentSeconds');
  }
  if (!requestData.started) missingFields.push('started');
  
  if (missingFields.length > 0) {
    throw new ApiError(
      400, 
      'Missing required fields', 
      'JIRA_LOGWORK_MISSING_FIELDS',
      { missingFields }
    );
  }
  
  const response = await jiraApiClient.logWork(token, jiraUrl, requestData);
  jiraLogger.success(`Worklog created for ${requestData.issueKey}`);
  
  res.json({
    jiraResponse: response.data,
    sent: true,
    issueKey: requestData.issueKey,
    timeSpentSeconds: requestData.timeSpentSeconds
  });
}));

// Endpoint to get details for multiple Jira issues by key
router.post('/issues/details', asyncHandler(async (req: Request, res: Response) => {
  const { token, jiraUrl } = getJiraCredentialsFromCookies(req);
  const requestData: JiraIssuesRequest = req.body;
  
  if (!Array.isArray(requestData.issueKeys) || requestData.issueKeys.length === 0) {
    throw new ApiError(400, 'Missing or empty issueKeys array', 'JIRA_ISSUES_MISSING_KEYS');
  }
  
  const response = await jiraApiClient.getIssuesDetails(token, jiraUrl, requestData);
  jiraLogger.info(`Retrieved ${requestData.issueKeys.length} issue details`);
  
  res.json({
    issues: response.data.issues,
    total: response.data.total,
    requestedKeys: requestData.issueKeys
  });
}));

// Endpoint to get details for multiple worklogs by ID
router.post('/worklogs/details', asyncHandler(async (req: Request, res: Response) => {
  const { token, jiraUrl } = getJiraCredentialsFromCookies(req);
  const requestData: JiraWorklogsRequest = req.body;
  
  if (!Array.isArray(requestData.worklogIds) || requestData.worklogIds.length === 0) {
    throw new ApiError(400, 'Missing or empty worklogIds array', 'JIRA_WORKLOGS_MISSING_IDS');
  }
  
  const response = await jiraApiClient.getWorklogsDetails(token, jiraUrl, requestData);
  jiraLogger.info(`Retrieved ${requestData.worklogIds.length} worklog details`);
  
  res.json({
    worklogs: response.data,
    total: response.data.length,
    requestedIds: requestData.worklogIds
  });
}));

// Endpoint to get assigned tasks filtered by status category
router.get('/tasks/assigned', asyncHandler(async (req: Request, res: Response) => {
  const { token, jiraUrl } = getJiraCredentialsFromCookies(req);
  const { statusCategories, maxResults } = req.query;

  const statusCategoriesArray = statusCategories
    ? (statusCategories as string).split(',').map(s => s.trim())
    : ['To Do', 'In Progress'];

  const maxResultsNumber = maxResults ? parseInt(maxResults as string, 10) : 50;

  const response = await jiraApiClient.getAssignedTasks(token, jiraUrl, statusCategoriesArray, maxResultsNumber);
  jiraLogger.info(`Retrieved ${response.data.issues.length} tasks`);

  res.json({
    issues: response.data.issues,
    total: response.data.total,
    statusCategories: statusCategoriesArray,
    maxResults: maxResultsNumber
  });
}));

// Test endpoint to try different JQL queries
router.post('/test/jql', asyncHandler(async (req: Request, res: Response) => {
  const { token, jiraUrl } = getJiraCredentialsFromCookies(req);
  const { jql } = req.body as { jql: string };

  if (!jql) {
    throw new ApiError(400, 'Missing JQL query', 'JIRA_TEST_MISSING_JQL');
  }

  jiraLogger.info(`Testing JQL query: ${jql}`);
  const url = `${jiraUrl}/rest/api/${API_VERSION}/search`;
  jiraLogger.info(`Request URL: ${url}`);
  const payload = {
    jql,
    maxResults: 10,
    fields: ['summary', 'status', 'priority', 'issuetype', 'key', 'project']
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    jiraLogger.success(`JQL query successful - found ${response.data.issues.length} issues`);

    res.json({
      success: true,
      jql,
      issues: response.data.issues,
      total: response.data.total
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    jiraLogger.error(`JQL query failed: ${axiosError?.response?.status}`);

    res.json({
      success: false,
      jql,
      error: axiosError?.response?.data || axiosError.message
    });
  }
}));

export default router;