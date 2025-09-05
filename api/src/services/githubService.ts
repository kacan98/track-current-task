import axios, { AxiosError } from 'axios';
import { createLogger } from '@shared/logger';
import type { GitHubTokenResponse, GitHubUser } from '../types/github';

const githubLogger = createLogger('GITHUB');

const GITHUB_API_BASE = 'https://api.github.com';

// Exchange authorization code for access token
export async function exchangeCodeForToken(code: string): Promise<GitHubTokenResponse> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth credentials not configured');
  }

  try {
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: clientId,
      client_secret: clientSecret,
      code
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    githubLogger.info('Successfully exchanged code for GitHub token');
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    githubLogger.error(`GitHub token exchange failed: ${axiosError?.response?.status || axiosError?.message}`);
    throw error;
  }
}

// Get authenticated user info
export async function getGitHubUser(token: string): Promise<GitHubUser> {
  try {
    const response = await axios.get(`${GITHUB_API_BASE}/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    githubLogger.info(`Retrieved GitHub user: ${response.data.login}`);
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    githubLogger.error(`Failed to get GitHub user: ${axiosError?.response?.status || axiosError?.message}`);
    throw error;
  }
}

// Get user's commits for a specific date across all accessible repositories
export async function getUserCommitsForDate(token: string, date: string) {
  githubLogger.info(`=== getUserCommitsForDate called ===`);
  githubLogger.info(`Token: ${token ? token.substring(0, 10) + '...' : 'MISSING'}`);
  githubLogger.info(`Date: ${date}`);
  
  try {
    // First, get the authenticated user info
    githubLogger.info('Getting GitHub user info...');
    const user = await getGitHubUser(token);
    githubLogger.info(`User retrieved: ${user.login}`);
    
    // Search for commits by the user on the specified date
    // GitHub API requires some search text, not just qualifiers for OAuth tokens
    // Using space separation instead of + to avoid encoding issues
    const searchQuery = `author:${user.login} author-date:${date}`;
    githubLogger.info(`Search query: ${searchQuery}`);
    
    githubLogger.info('Making request to GitHub Search API...');
    // Build URL with properly encoded query
    const url = `${GITHUB_API_BASE}/search/commits?q=${encodeURIComponent(searchQuery)}&sort=author-date&order=asc&per_page=100`;
    githubLogger.info(`Full URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'track-current-task-app'
      }
    });

    githubLogger.info(`GitHub API response status: ${response.status}`);
    githubLogger.info(`GitHub API response: ${JSON.stringify(response.data, null, 2)}`);
    
    const commits = response.data.items.map((item: { sha: string; html_url: string; commit: { message: string; author: { date: string; name: string; email: string } }; repository: { name: string; full_name: string } }) => ({
      sha: item.sha,
      shortSha: item.sha.substring(0, 7),
      message: item.commit.message,
      date: item.commit.author.date,
      url: item.html_url,
      repository: {
        name: item.repository.name,
        fullName: item.repository.full_name
      },
      author: item.commit.author
    }));

    githubLogger.info(`Processed ${commits.length} commits`);
    githubLogger.info(`Final commits array: ${JSON.stringify(commits, null, 2)}`);
    return commits;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    githubLogger.error(`ERROR in getUserCommitsForDate:`);
    githubLogger.error(`Status: ${axiosError?.response?.status}`);
    githubLogger.error(`Message: ${axiosError?.message}`);
    githubLogger.error(`Response data: ${JSON.stringify(axiosError?.response?.data, null, 2)}`);
    throw error;
  }
}