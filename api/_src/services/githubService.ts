import axios, { AxiosError } from 'axios';
import { createLogger } from '../../../shared/logger';
import type { GitHubTokenResponse, GitHubUser } from '../types/github';

const githubLogger = createLogger('GITHUB');

const GITHUB_API_BASE = 'https://api.github.com';

// Helper function to make GitHub API calls with proper headers
async function githubApiCall<T = any>(token: string, url: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<T> {
  const response = await axios({
    method,
    url,
    data,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'track-current-task-app'
    }
  });
  return response.data;
}

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
    return await githubApiCall<GitHubUser>(token, `${GITHUB_API_BASE}/user`);
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

// Get the most recent review for a PR
async function getLastReview(token: string, prApiUrl: string, prNumber: number) {
  try {
    const reviewsResponse = await axios.get(`${prApiUrl}/reviews`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'track-current-task-app'
      }
    });

    if (reviewsResponse.data.length > 0) {
      const sortedReviews = reviewsResponse.data.sort((a: { submitted_at: string }, b: { submitted_at: string }) =>
        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      );
      const lastReview = sortedReviews[0];
      return {
        submittedAt: lastReview.submitted_at,
        state: lastReview.state,
        changesRequested: lastReview.state === 'CHANGES_REQUESTED'
      };
    }
    return null;
  } catch (error) {
    githubLogger.warn(`Failed to fetch reviews for PR #${prNumber}`);
    return null;
  }
}

// Get the last commit date for a PR
async function getLastCommit(token: string, prApiUrl: string, prNumber: number) {
  try {
    const commitsResponse = await axios.get(`${prApiUrl}/commits`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'track-current-task-app'
      }
    });

    if (commitsResponse.data.length > 0) {
      const lastCommit = commitsResponse.data[commitsResponse.data.length - 1];
      return lastCommit.commit.author.date;
    }
    return null;
  } catch (error) {
    githubLogger.warn(`Failed to fetch commits for PR #${prNumber}`);
    return null;
  }
}

// Get check status for a commit with detailed failure information
async function getCheckStatus(token: string, repoFullName: string, commitSha: string) {
  try {
    const [owner, repo] = repoFullName.split('/');
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${commitSha}/check-runs`;

    const response = await githubApiCall(token, url);
    const checkRuns = response.check_runs;
    if (checkRuns.length === 0) {
      return { state: 'none', total: 0, passed: 0, failed: 0, pending: 0, checks: [] };
    }

    interface CheckRunStep {
      name: string;
      status: string;
      conclusion: string | null;
      number: number;
    }

    interface CheckRun {
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
      html_url: string;
      details_url: string;
      output?: {
        title: string | null;
        summary: string | null;
      };
    }

    const passedChecks = checkRuns.filter((run: CheckRun) => run.conclusion === 'success');
    const failedChecks = checkRuns.filter((run: CheckRun) => ['failure', 'timed_out', 'action_required'].includes(run.conclusion || ''));
    const pendingChecks = checkRuns.filter((run: CheckRun) => run.status !== 'completed' || run.conclusion === null);

    let state = 'success';
    if (failedChecks.length > 0) {
      state = 'failure';
    } else if (pendingChecks.length > 0) {
      state = 'pending';
    }

    // For failed checks, try to get detailed step information
    const checksWithDetails = await Promise.all(
      checkRuns.map(async (run: CheckRun) => {
        let failedStep = null;
        let errorMessage = null;

        // Only fetch details for failed or action_required checks to avoid extra API calls
        if (['failure', 'timed_out', 'action_required'].includes(run.conclusion || '')) {
          try {
            // Get the workflow run associated with this check
            const checkDetailUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/check-runs/${run.id}`;
            const checkDetail = await githubApiCall(token, checkDetailUrl);
            const workflowRunId = checkDetail.check_suite?.id;

            // Get steps if this is a GitHub Actions run
            if (checkDetail.output?.title || checkDetail.output?.summary) {
              // Extract failed step from output
              const outputText = checkDetail.output?.title || checkDetail.output?.summary || '';
              const stepMatch = outputText.match(/Step\s+#?(\d+)/i) || outputText.match(/(\w+[\s\w]*?)\s+failed/i);
              if (stepMatch) {
                failedStep = stepMatch[1];
              }

              // Extract error message from output
              // Use summary if available, otherwise use title, or the full text
              errorMessage = checkDetail.output?.summary || checkDetail.output?.title || checkDetail.output?.text || null;

              // Limit error message length to avoid huge payloads (max 500 chars)
              if (errorMessage && errorMessage.length > 500) {
                errorMessage = errorMessage.substring(0, 500) + '...';
              }
            }
          } catch (detailError) {
            // Silently fail - we'll just not show step details
          }
        }

        return {
          id: run.id,
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          url: run.html_url || run.details_url,
          failedStep: failedStep,
          errorMessage: errorMessage
        };
      })
    );

    return {
      state,
      total: checkRuns.length,
      passed: passedChecks.length,
      failed: failedChecks.length,
      pending: pendingChecks.length,
      checks: checksWithDetails
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    githubLogger.warn(`Failed to fetch check status for commit ${commitSha}: ${axiosError?.response?.status || axiosError?.message}`);
    return { state: 'unknown', total: 0, passed: 0, failed: 0, pending: 0, checks: [] };
  }
}

// Get review information for a PR
async function getReviewStatus(token: string, repoFullName: string, prNumber: number) {
  try {
    const [owner, repo] = repoFullName.split('/');
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/reviews`;

    const reviews = await githubApiCall(token, url);

    if (reviews.length === 0) {
      return { reviewers: [], state: 'no_reviews' };
    }

    // Group reviews by user, keeping only the most recent review from each reviewer
    const reviewsByUser = new Map();
    reviews.forEach((review: { user: { login: string; avatar_url: string }; state: string; submitted_at: string }) => {
      const login = review.user.login;
      const existingReview = reviewsByUser.get(login);

      if (!existingReview || new Date(review.submitted_at) > new Date(existingReview.submitted_at)) {
        reviewsByUser.set(login, review);
      }
    });

    // Convert to array and determine overall state
    const reviewers = Array.from(reviewsByUser.values()).map((review: { user: { login: string; avatar_url: string }; state: string }) => ({
      login: review.user.login,
      avatarUrl: review.user.avatar_url,
      state: review.state
    }));

    // Determine overall review state
    const hasChangesRequested = reviewers.some(r => r.state === 'CHANGES_REQUESTED');
    const hasApproved = reviewers.some(r => r.state === 'APPROVED');
    const allApproved = reviewers.every(r => r.state === 'APPROVED');

    let state = 'no_reviews';
    if (hasChangesRequested) {
      state = 'changes_requested';
    } else if (allApproved && reviewers.length > 0) {
      state = 'approved';
    } else if (hasApproved) {
      state = 'partial_approval';
    } else if (reviewers.length > 0) {
      state = 'commented';
    }

    return { reviewers, state };
  } catch (error) {
    const axiosError = error as AxiosError;
    githubLogger.warn(`Failed to fetch reviews for PR ${prNumber}: ${axiosError?.response?.status || axiosError?.message}`);
    return { reviewers: [], state: 'no_reviews' };
  }
}

// Request review from reviewers
export async function requestReview(token: string, repoFullName: string, prNumber: number, reviewers: string[]) {
  try {
    const [owner, repo] = repoFullName.split('/');
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/requested_reviewers`;

    await githubApiCall(token, url, 'POST', { reviewers });
    githubLogger.info(`Successfully requested review for PR #${prNumber} from ${reviewers.join(', ')}`);
    return { success: true };
  } catch (error) {
    const axiosError = error as AxiosError;
    githubLogger.error(`Failed to request review for PR ${prNumber}: ${axiosError?.response?.status || axiosError?.message}`);
    throw error;
  }
}

export async function rerunCheck(token: string, repoFullName: string, checkRunId: number) {
  try {
    const [owner, repo] = repoFullName.split('/');

    // First, get the check run details to find the associated workflow run
    const checkRunUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/check-runs/${checkRunId}`;
    const checkRun = await githubApiCall(token, checkRunUrl);

    // Get the workflow run ID from the check suite
    const checkSuiteId = checkRun.check_suite?.id;

    if (!checkSuiteId) {
      throw new Error('No check suite found for this check run');
    }

    // Get the workflow runs for this check suite
    const workflowRunsUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs?check_suite_id=${checkSuiteId}`;
    const workflowRunsResponse = await githubApiCall(token, workflowRunsUrl);

    if (!workflowRunsResponse.workflow_runs || workflowRunsResponse.workflow_runs.length === 0) {
      throw new Error('No workflow run found for this check');
    }

    const workflowRunId = workflowRunsResponse.workflow_runs[0].id;

    // Trigger the rerun for failed jobs only
    const rerunUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${workflowRunId}/rerun-failed-jobs`;
    await githubApiCall(token, rerunUrl, 'POST');

    githubLogger.info(`Successfully triggered rerun for check run ${checkRunId} (workflow run ${workflowRunId})`);
    return { success: true };
  } catch (error) {
    const axiosError = error as AxiosError;
    githubLogger.error(`Failed to rerun check ${checkRunId}: ${axiosError?.response?.status || axiosError?.message}`);
    throw error;
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

// Search for user's pull requests matching task IDs
export async function searchUserPullRequests(token: string, taskIds: string[]) {
  githubLogger.info(`Searching PRs for ${taskIds.length} task IDs`);

  try {
    const user = await getGitHubUser(token);

    // Search for all user's PRs, sorted by recently updated
    const searchQuery = `author:${user.login} type:pr`;
    const url = `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(searchQuery)}&sort=updated&order=desc&per_page=100`;

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'track-current-task-app'
      }
    });

    // Filter PRs by checking if head branch contains any task ID
    const matchedPRs = response.data.items
      .filter((pr: { pull_request?: { html_url: string }; html_url?: string }) => pr.pull_request) // Ensure it's a PR
      .map((pr: { number: number; title: string; state: string; draft: boolean; html_url: string; repository_url: string; pull_request: { url: string }; created_at: string; updated_at: string; closed_at?: string }) => {
        // Get the full PR details to access head branch
        return {
          number: pr.number,
          title: pr.title,
          state: pr.state,
          draft: pr.draft,
          url: pr.html_url,
          repositoryUrl: pr.repository_url,
          prApiUrl: pr.pull_request.url,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          closedAt: pr.closed_at
        };
      });

    // Fetch detailed PR info to get head branch for each PR
    const detailedPRs = await Promise.all(
      matchedPRs.map(async (pr: { prApiUrl: string; number: number; title: string; state: string; draft: boolean; url: string; repositoryUrl: string; createdAt: string; updatedAt: string; closedAt?: string }) => {
        try {
          const prDetails = await axios.get(pr.prApiUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github+json',
              'User-Agent': 'track-current-task-app'
            }
          });

          const headBranch = prDetails.data.head.ref;
          const repoFullName = prDetails.data.base.repo.full_name;
          const merged = prDetails.data.merged;
          const mergedAt = prDetails.data.merged_at;
          const prTitle = pr.title;
          const prBody = prDetails.data.body || '';
          const comments = prDetails.data.comments || 0;
          const reviewComments = prDetails.data.review_comments || 0;

          // Check if PR has merge conflicts
          const mergeable = prDetails.data.mergeable;
          const mergeableState = prDetails.data.mergeable_state;

          // Get last review and commit information
          const lastReview = await getLastReview(token, prDetails.data.url, pr.number);
          const lastCommitDate = await getLastCommit(token, prDetails.data.url, pr.number);

          const changesRequested = lastReview?.changesRequested || false;
          const lastReviewDate = lastReview?.submittedAt || null;
          const lastReviewState = lastReview?.state || null;

          // Get check status for the PR
          const checkStatus = await getCheckStatus(token, repoFullName, prDetails.data.head.sha);

          // Get review status for the PR
          const reviewStatus = await getReviewStatus(token, repoFullName, pr.number);

          // Check if branch, title, or description contains any task ID
          const matchedTaskId = taskIds.find(taskId => {
            const taskIdLower = taskId.toLowerCase();
            const branchLower = headBranch.toLowerCase();
            const titleLower = prTitle.toLowerCase();
            const bodyLower = prBody.toLowerCase();

            return branchLower.includes(taskIdLower) ||
                   titleLower.includes(taskIdLower) ||
                   bodyLower.includes(taskIdLower);
          });

          if (!matchedTaskId) {
            return null;
          }

          return {
            taskId: matchedTaskId,
            number: pr.number,
            title: pr.title,
            state: pr.state,
            draft: pr.draft,
            url: prDetails.data.html_url,
            branch: headBranch,
            repository: {
              name: repoFullName.split('/')[1],
              fullName: repoFullName
            },
            createdAt: pr.createdAt,
            updatedAt: pr.updatedAt,
            merged,
            mergedAt,
            comments,
            reviewComments,
            changesRequested,
            lastCommitDate,
            lastReviewDate,
            lastReviewState,
            mergeable,
            mergeableState,
            checkStatus,
            reviewStatus
          };
        } catch (error) {
          const axiosError = error as AxiosError;
          githubLogger.warn(`Failed to fetch PR details for #${pr.number}: ${axiosError?.response?.status || axiosError?.message}`);
          return null;
        }
      })
    );

    // Filter out nulls and group by task ID
    const validPRs = detailedPRs.filter((pr): pr is NonNullable<typeof pr> => pr !== null);

    githubLogger.info(`Found ${validPRs.length} matching PRs`);

    return validPRs;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    githubLogger.error(`Failed to search PRs: ${axiosError?.response?.status || axiosError?.message}`);
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

// Search for branches matching a task ID
export async function searchBranchesForTaskId(token: string, taskId: string) {
  try {
    const user = await getGitHubUser(token);

    // Search for branches containing the task ID
    // We'll search through the user's repositories
    const reposUrl = `${GITHUB_API_BASE}/user/repos?per_page=100&affiliation=owner,collaborator,organization_member`;
    const reposResponse = await githubApiCall(token, reposUrl);

    const matchingBranches = [];

    // Search through repositories for matching branches
    for (const repo of reposResponse) {
      try {
        const branchesUrl = `${GITHUB_API_BASE}/repos/${repo.full_name}/branches?per_page=100`;
        const branches = await githubApiCall(token, branchesUrl);

        for (const branch of branches) {
          // Check if branch name contains the task ID (case insensitive)
          if (branch.name.toLowerCase().includes(taskId.toLowerCase())) {
            // Get last commit date for this branch
            let lastCommitDate = null;
            try {
              const commitUrl = `${GITHUB_API_BASE}/repos/${repo.full_name}/commits/${branch.commit.sha}`;
              const commitData = await githubApiCall(token, commitUrl);
              lastCommitDate = commitData.commit.author.date;
            } catch (error) {
              // If we can't get commit date, just skip it
            }

            matchingBranches.push({
              name: branch.name,
              repository: {
                name: repo.name,
                fullName: repo.full_name
              },
              createPrUrl: `https://github.com/${repo.full_name}/compare/${repo.default_branch}...${branch.name}?expand=1`,
              lastCommitDate
            });
          }
        }
      } catch (error) {
        // Skip repositories we can't access
        continue;
      }
    }

    return matchingBranches;
  } catch (error) {
    const axiosError = error as AxiosError;
    githubLogger.warn(`Failed to search branches for task ${taskId}: ${axiosError?.response?.status || axiosError?.message}`);
    return [];
  }
}