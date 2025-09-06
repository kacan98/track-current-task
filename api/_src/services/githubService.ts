import axios, { AxiosError } from 'axios';
import { createLogger } from '../../../shared/logger';
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

    githubLogger.info('GitHub OAuth token exchanged successfully');
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

    githubLogger.info('GitHub user retrieved successfully');
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    githubLogger.error(`Failed to get GitHub user: ${axiosError?.response?.status || axiosError?.message}`);
    throw error;
  }
}

// Get pull requests associated with a specific commit
export async function getPullRequestsForCommit(token: string, owner: string, repo: string, sha: string) {
  try {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${sha}/pulls`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'track-current-task-app'
      }
    });

    return response.data.map((pr: { number: number; head: { ref: string; repo: { full_name?: string } | null }; title: string; state: string; html_url: string }) => ({
      number: pr.number,
      branchName: pr.head.ref,
      title: pr.title,
      state: pr.state,
      branchDeleted: pr.head.repo === null,
      url: pr.html_url
    }));
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    // Don't log this as an error since many commits won't have PRs
    if (axiosError?.response?.status !== 404) {
      githubLogger.warn(`Failed to fetch PRs for commit ${sha}: ${axiosError?.response?.status || axiosError?.message}`);
    }
    return [];
  }
}

// Get user's commits for a date range across all accessible repositories  
export async function getUserCommitsForDateRange(token: string, startDate: string, endDate: string) {
  githubLogger.info(`Fetching commits for date range: ${startDate} to ${endDate}`);
  
  try {
    // First, get the authenticated user info
    const user = await getGitHubUser(token);
    
    // Build search query for date range
    const searchQuery = `author:${user.login} author-date:${startDate}..${endDate}`;
    
    // Build URL with properly encoded query
    const url = `${GITHUB_API_BASE}/search/commits?q=${encodeURIComponent(searchQuery)}&sort=author-date&order=asc&per_page=100`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'track-current-task-app'
      }
    });

    // Process commits similar to single date function
    const commits = await Promise.all(response.data.items.map(async (item: { sha: string; html_url: string; commit: { message: string; author: { date: string; name: string; email: string } }; repository: { name: string; full_name: string } }) => {
      const [owner, repoName] = item.repository.full_name.split('/');
      const prs = await getPullRequestsForCommit(token, owner, repoName, item.sha);
      
      let branchName = 'main';
      if (prs.length > 0) {
        branchName = prs[0].branchName;
      }
      
      return {
        sha: item.sha,
        shortSha: item.sha.substring(0, 7),
        message: item.commit.message,
        date: item.commit.author.date,
        url: item.html_url,
        repository: {
          name: item.repository.name,
          fullName: item.repository.full_name
        },
        author: item.commit.author,
        branch: branchName,
        pullRequest: prs.length > 0 ? {
          number: prs[0].number,
          title: prs[0].title,
          branchDeleted: prs[0].branchDeleted,
          url: prs[0].url
        } : null
      };
    }));

    githubLogger.info(`Found ${commits.length} commits for range ${startDate} to ${endDate}`);
    return commits;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    githubLogger.error(`Failed to fetch commits for range: ${axiosError?.response?.status || axiosError?.message}`);
    throw error;
  }
}

// Get user's commits for a specific date across all accessible repositories
export async function getUserCommitsForDate(token: string, date: string) {
  githubLogger.info(`Fetching commits for date: ${date}`);
  
  try {
    // First, get the authenticated user info
    const user = await getGitHubUser(token);
    
    // Search for commits by the user on the specified date
    // GitHub API requires some search text, not just qualifiers for OAuth tokens
    // Using space separation instead of + to avoid encoding issues
    const searchQuery = `author:${user.login} author-date:${date}`;
    
    // Build URL with properly encoded query
    const url = `${GITHUB_API_BASE}/search/commits?q=${encodeURIComponent(searchQuery)}&sort=author-date&order=asc&per_page=100`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'track-current-task-app'
      }
    });

    // Response received successfully
    
    const commits = await Promise.all(response.data.items.map(async (item: { sha: string; html_url: string; commit: { message: string; author: { date: string; name: string; email: string } }; repository: { name: string; full_name: string } }) => {
      // Extract owner and repo from full_name
      const [owner, repoName] = item.repository.full_name.split('/');
      
      // Get PR information for this commit
      const prs = await getPullRequestsForCommit(token, owner, repoName, item.sha);
      
      // Determine branch name
      let branchName = 'main'; // Default assumption for direct commits
      if (prs.length > 0) {
        branchName = prs[0].branchName;
      }
      
      return {
        sha: item.sha,
        shortSha: item.sha.substring(0, 7),
        message: item.commit.message,
        date: item.commit.author.date,
        url: item.html_url,
        repository: {
          name: item.repository.name,
          fullName: item.repository.full_name
        },
        author: item.commit.author,
        branch: branchName,
        pullRequest: prs.length > 0 ? {
          number: prs[0].number,
          title: prs[0].title,
          branchDeleted: prs[0].branchDeleted,
          url: prs[0].url
        } : null
      };
    }));

    githubLogger.info(`Found ${commits.length} commits for ${date}`);
    return commits;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    githubLogger.error(`Failed to fetch commits: ${axiosError?.response?.status || axiosError?.message}`);
    throw error;
  }
}