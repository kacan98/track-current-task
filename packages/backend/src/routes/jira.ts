import { Router, Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { getJiraToken } from '../services/jiraService';
import { isProduction } from '../config/cors';
import { createLogger } from '@shared/logger';
import { jiraApiClient } from '../services/jiraApiClient';
import type { 
  JiraAuthRequest, 
  JiraLogWorkRequest, 
  JiraIssuesRequest, 
  JiraWorklogsRequest 
} from '../types/jira';

const router = Router();
const jiraLogger = createLogger('JIRA');

// Helper to validate and extract Jira token from cookies
function getJiraTokenFromCookies(req: Request): string {
  const token = req.signedCookies?.jiraToken;
  if (!token) {
    throw new ApiError(401, 'Not authenticated. Please log in first.', 'AUTH_REQUIRED');
  }
  return token;
}

// Authentication endpoints
router.post('/auth/login', asyncHandler(async (req: Request, res: Response) => {
  const { login, password, name }: JiraAuthRequest = req.body;
  
  if (!login || !password) {
    throw new ApiError(400, 'Missing login or password', 'AUTH_MISSING_CREDENTIALS');
  }
  
  jiraLogger.info('Authentication attempt');
  const tokenData = await getJiraToken(login, password, name);
  
  // Store token in encrypted cookie with environment-aware settings
  const jiraToken = tokenData.rawToken;
  res.cookie('jiraToken', jiraToken, {
    signed: true,        // Encrypt the cookie
    httpOnly: true,      // Prevent XSS
    secure: isProduction, // HTTPS only in production
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    sameSite: isProduction ? 'strict' : 'lax' // Stricter CSRF in prod
  });
  
  jiraLogger.success('User authenticated successfully');
  res.json({ 
    success: true, 
    message: 'Successfully authenticated with Jira',
    hasFilesystemAccess: process.env.DEV === 'true'
  });
}));

router.post('/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('jiraToken');
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
  const token = getJiraTokenFromCookies(req);
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
  
  const response = await jiraApiClient.logWork(token, requestData);
  jiraLogger.success(`Worklog created for ${requestData.issueKey}: ${requestData.timeSpentSeconds}s`);
  
  res.json({
    jiraResponse: response.data,
    sent: true,
    issueKey: requestData.issueKey,
    timeSpentSeconds: requestData.timeSpentSeconds
  });
}));

// Endpoint to get details for multiple Jira issues by key
router.post('/issues/details', asyncHandler(async (req: Request, res: Response) => {
  const token = getJiraTokenFromCookies(req);
  const requestData: JiraIssuesRequest = req.body;
  
  if (!Array.isArray(requestData.issueKeys) || requestData.issueKeys.length === 0) {
    throw new ApiError(400, 'Missing or empty issueKeys array', 'JIRA_ISSUES_MISSING_KEYS');
  }
  
  const response = await jiraApiClient.getIssuesDetails(token, requestData);
  jiraLogger.info(`Retrieved details for ${requestData.issueKeys.length} issues`);
  
  res.json({
    issues: response.data.issues,
    total: response.data.total,
    requestedKeys: requestData.issueKeys
  });
}));

// Endpoint to get details for multiple worklogs by ID
router.post('/worklogs/details', asyncHandler(async (req: Request, res: Response) => {
  const token = getJiraTokenFromCookies(req);
  const requestData: JiraWorklogsRequest = req.body;
  
  if (!Array.isArray(requestData.worklogIds) || requestData.worklogIds.length === 0) {
    throw new ApiError(400, 'Missing or empty worklogIds array', 'JIRA_WORKLOGS_MISSING_IDS');
  }
  
  const response = await jiraApiClient.getWorklogsDetails(token, requestData);
  jiraLogger.info(`Retrieved details for ${requestData.worklogIds.length} worklogs`);
  
  res.json({
    worklogs: response.data,
    total: response.data.length,
    requestedIds: requestData.worklogIds
  });
}));

export default router;