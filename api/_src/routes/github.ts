import { Router, Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { exchangeCodeForToken, getGitHubUser, getUserCommitsForDate } from '../services/githubService';
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

// Authentication endpoints
router.post('/auth', asyncHandler(async (req: Request, res: Response) => {
  const { code }: GitHubAuthRequest = req.body;
  
  if (!code) {
    throw new ApiError(400, 'Missing authorization code', 'GITHUB_AUTH_MISSING_CODE');
  }
  
  githubLogger.info('GitHub OAuth authentication attempt');
  
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
      sameSite: isProduction ? 'strict' : 'lax' // Stricter CSRF in prod
    });
    
    githubLogger.success(`GitHub user authenticated successfully: ${user.login}`);
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
    githubLogger.error('GitHub authentication failed');
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
  githubLogger.info(`=== GitHub Commits API Called ===`);
  githubLogger.info(`Request URL: ${req.url}`);
  githubLogger.info(`Request query: ${JSON.stringify(req.query)}`);
  
  const token = getGitHubTokenFromCookies(req);
  githubLogger.info(`Token found: ${token ? 'YES' : 'NO'}`);
  
  const { date } = req.query as { date?: string };
  
  if (!date) {
    githubLogger.error('Missing date parameter');
    throw new ApiError(400, 'Missing date parameter', 'GITHUB_COMMITS_MISSING_DATE');
  }
  
  githubLogger.info(`Requested date: ${date}`);
  
  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    githubLogger.error(`Invalid date format: ${date}`);
    throw new ApiError(400, 'Invalid date format. Expected YYYY-MM-DD', 'GITHUB_COMMITS_INVALID_DATE');
  }
  
  githubLogger.info('Calling getUserCommitsForDate...');
  const commits = await getUserCommitsForDate(token, date);
  
  githubLogger.info(`Retrieved ${commits.length} commits for date: ${date}`);
  githubLogger.info(`Commits data: ${JSON.stringify(commits, null, 2)}`);
  
  const response = {
    commits,
    date,
    total: commits.length
  };
  
  githubLogger.info(`Sending response: ${JSON.stringify(response, null, 2)}`);
  res.json(response);
}));

export default router;