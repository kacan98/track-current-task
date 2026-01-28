import { Router, Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { exchangeCodeForToken, getGitHubUser, getUserCommitsForDate, getUserCommitsForDateRange, searchUserPullRequests, searchBranchesForTaskId, requestReview, rerunCheck } from '../services/githubService';
import { isProduction } from '../config/cors';
import { createLogger } from '../../../shared/logger';
import type { GitHubAuthRequest } from '../types/github';

const router = Router();
const githubLogger = createLogger('GITHUB');

// Helper to validate and extract GitHub token from cookies
function getGitHubTokenFromCookies(req: Request): string {
  const token = req.signedCookies?.githubToken;
  if (!token) {
    throw new ApiError(401, 'Not authenticated with GitHub. Please log in first.', 'GITHUB_AUTH_REQUIRED');
  }
  return token;
}

// PAT Authentication endpoint
router.post('/auth/pat', asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  
  if (!token) {
    throw new ApiError(400, 'Missing Personal Access Token', 'GITHUB_AUTH_MISSING_PAT');
  }
  
  githubLogger.info('PAT authentication attempt');
  
  try {
    // Validate the PAT by making a test API call
    const user = await getGitHubUser(token);
    
    // Store token in encrypted cookie with environment-aware settings
    res.cookie('githubToken', token, {
      signed: true,        // Encrypt the cookie
      httpOnly: true,      // Prevent XSS
      secure: isProduction, // HTTPS only in production
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: isProduction ? 'strict' : 'lax', // Stricter CSRF in prod
      path: '/'            // Make cookie available to all routes
    });
    
    githubLogger.success('PAT authentication successful');
    res.json({ 
      success: true, 
      message: 'Successfully authenticated with GitHub using PAT',
      user: {
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    githubLogger.error('GitHub PAT authentication failed');
    throw new ApiError(401, 'Invalid Personal Access Token', 'GITHUB_PAT_INVALID');
  }
}));

// OAuth Authentication endpoint
router.post('/auth', asyncHandler(async (req: Request, res: Response) => {
  const { code }: GitHubAuthRequest = req.body;
  
  if (!code) {
    throw new ApiError(400, 'Missing authorization code', 'GITHUB_AUTH_MISSING_CODE');
  }
  
  githubLogger.info('OAuth authentication attempt');
  
  try {
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);
    
    // Get user info to verify token works
    const user = await getGitHubUser(tokenData.access_token);
    
    // Store token in encrypted cookie with environment-aware settings
    res.cookie('githubToken', tokenData.access_token, {
      signed: true,        // Encrypt the cookie
      httpOnly: true,      // Prevent XSS
      secure: isProduction, // HTTPS only in production
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: isProduction ? 'strict' : 'lax', // Stricter CSRF in prod
      path: '/'            // Make cookie available to all routes
    });
    
    githubLogger.success('OAuth authentication successful');
    res.json({ 
      success: true, 
      message: 'Successfully authenticated with GitHub',
      user: {
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url
      }
    });
  } catch {
    githubLogger.error('OAuth authentication failed');
    throw new ApiError(401, 'GitHub authentication failed', 'GITHUB_AUTH_FAILED');
  }
}));

router.post('/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('githubToken');
  githubLogger.info('User logged out from GitHub');
  res.json({ success: true, message: 'Logged out from GitHub successfully' });
});

router.get('/auth/status', asyncHandler(async (req: Request, res: Response) => {
  const githubToken = req.signedCookies.githubToken;
  
  if (!githubToken) {
    res.json({ authenticated: false });
    return;
  }

  try {
    // Verify token is still valid by making a simple API call
    const user = await getGitHubUser(githubToken);
    res.json({ 
      authenticated: true,
      user: {
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url
      }
    });
  } catch {
    // Token is invalid/expired, clear the cookie
    res.clearCookie('githubToken');
    res.json({ authenticated: false });
  }
}));

// Get commits for a specific date
router.get('/commits', asyncHandler(async (req: Request, res: Response) => {
  const token = getGitHubTokenFromCookies(req);
  const { date } = req.query as { date?: string };
  
  if (!date) {
    githubLogger.error('Missing date parameter');
    throw new ApiError(400, 'Missing date parameter', 'GITHUB_COMMITS_MISSING_DATE');
  }
  
  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    githubLogger.error(`Invalid date format: ${date}`);
    throw new ApiError(400, 'Invalid date format. Expected YYYY-MM-DD', 'GITHUB_COMMITS_INVALID_DATE');
  }
  
  const commits = await getUserCommitsForDate(token, date);
  
  const response = {
    commits,
    date,
    total: commits.length
  };
  
  res.json(response);
}));

// Get commits for a date range
router.get('/commits/range', asyncHandler(async (req: Request, res: Response) => {
  const token = getGitHubTokenFromCookies(req);
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  
  if (!startDate || !endDate) {
    githubLogger.error('Missing startDate or endDate parameter');
    throw new ApiError(400, 'Missing startDate or endDate parameter', 'GITHUB_COMMITS_MISSING_DATE_RANGE');
  }
  
  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    githubLogger.error(`Invalid date format: ${startDate} or ${endDate}`);
    throw new ApiError(400, 'Invalid date format. Expected YYYY-MM-DD', 'GITHUB_COMMITS_INVALID_DATE');
  }
  
  const commits = await getUserCommitsForDateRange(token, startDate, endDate);
  
  const response = {
    commits,
    startDate,
    endDate,
    total: commits.length
  };
  
  res.json(response);
}));

// Search for pull requests matching task IDs
router.post('/pulls/search', asyncHandler(async (req: Request, res: Response) => {
  const token = getGitHubTokenFromCookies(req);
  const { taskIds } = req.body as { taskIds: string[] };

  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    githubLogger.error('Missing or empty taskIds array');
    throw new ApiError(400, 'Missing or empty taskIds array', 'GITHUB_PRS_MISSING_TASK_IDS');
  }

  const pullRequests = await searchUserPullRequests(token, taskIds);

  res.json({
    pullRequests,
    total: pullRequests.length,
    taskIds
  });
}));

// Search for branches matching a task ID
router.get('/branches/search', asyncHandler(async (req: Request, res: Response) => {
  const token = getGitHubTokenFromCookies(req);
  const { taskId } = req.query as { taskId?: string };

  if (!taskId) {
    throw new ApiError(400, 'Missing taskId parameter', 'GITHUB_BRANCHES_MISSING_TASK_ID');
  }

  const branches = await searchBranchesForTaskId(token, taskId);

  res.json({
    branches,
    total: branches.length,
    taskId
  });
}));

// Request review on a PR
router.post('/pulls/:owner/:repo/:number/request-review', asyncHandler(async (req: Request, res: Response) => {
  const token = getGitHubTokenFromCookies(req);
  const { owner, repo, number } = req.params;
  const { reviewers } = req.body as { reviewers: string[] };

  if (!reviewers || !Array.isArray(reviewers) || reviewers.length === 0) {
    throw new ApiError(400, 'Missing or invalid reviewers array', 'GITHUB_REVIEWERS_INVALID');
  }

  const repoFullName = `${owner}/${repo}`;
  const prNumber = parseInt(number, 10);

  await requestReview(token, repoFullName, prNumber, reviewers);

  githubLogger.success(`Review requested for PR #${prNumber}`);
  res.json({
    success: true,
    message: `Successfully requested review from ${reviewers.join(', ')}`
  });
}));

// Rerun a failed check
router.post('/checks/:owner/:repo/:checkRunId/rerun', asyncHandler(async (req: Request, res: Response) => {
  const token = getGitHubTokenFromCookies(req);
  const { owner, repo, checkRunId } = req.params;

  const repoFullName = `${owner}/${repo}`;
  const checkId = parseInt(checkRunId, 10);

  await rerunCheck(token, repoFullName, checkId);

  githubLogger.success(`Rerun triggered for check ${checkRunId}`);
  res.json({
    success: true,
    message: 'Check rerun triggered successfully'
  });
}));

export default router;