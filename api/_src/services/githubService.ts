import axios, { AxiosError } from 'axios';
import { createLogger } from '../../../shared/logger';
import type { GitHubTokenResponse, GitHubUser } from '../types/github';

const githubLogger = createLogger('GITHUB');

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

// Helper function to make GitHub API calls with proper headers
async function githubApiCall<T = any>(token: string, url: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<T> {
  try {
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
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      const headers = axiosError.response.headers;
      githubLogger.error(`GitHub API Error:
        URL: ${url}
        Status: ${axiosError.response.status}
        Message: ${JSON.stringify(axiosError.response.data)}
        Rate Limit Remaining: ${headers['x-ratelimit-remaining'] || 'N/A'}
        Rate Limit Reset: ${headers['x-ratelimit-reset'] ? new Date(parseInt(headers['x-ratelimit-reset']) * 1000).toISOString() : 'N/A'}
        Token (first 7 chars): ${token.substring(0, 7)}...`);
    }
    throw error;
  }
}

// Helper function to make GitHub GraphQL API calls
async function githubGraphQLCall<T = any>(token: string, query: string, variables?: Record<string, any>): Promise<T> {
  try {
    const response = await axios.post(
      GITHUB_GRAPHQL_ENDPOINT,
      { query, variables },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'track-current-task-app'
        }
      }
    );

    if (response.data.errors) {
      githubLogger.error(`GitHub GraphQL Errors: ${JSON.stringify(response.data.errors)}`);
      throw new Error(`GraphQL Error: ${response.data.errors[0]?.message || 'Unknown error'}`);
    }

    return response.data.data;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      const headers = axiosError.response.headers;
      githubLogger.error(`GitHub GraphQL API Error:
        Status: ${axiosError.response.status}
        Message: ${JSON.stringify(axiosError.response.data)}
        Rate Limit Remaining: ${headers['x-ratelimit-remaining'] || 'N/A'}
        Rate Limit Reset: ${headers['x-ratelimit-reset'] ? new Date(parseInt(headers['x-ratelimit-reset']) * 1000).toISOString() : 'N/A'}`);
    }
    throw error;
  }
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
  return await githubApiCall<GitHubUser>(token, `${GITHUB_API_BASE}/user`);
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
            // Get the check run details which includes steps for GitHub Actions
            const checkDetailUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/check-runs/${run.id}`;
            const checkDetail = await githubApiCall(token, checkDetailUrl);

            // First try to get step information from the check run output
            if (checkDetail.output?.title || checkDetail.output?.summary) {
              errorMessage = checkDetail.output?.summary || checkDetail.output?.title || null;
            }

            // For GitHub Actions, fetch the job to get step-level details
            // The check run is linked to a job via the external_id or we can find it through the check suite
            const checkSuiteId = checkDetail.check_suite?.id;
            if (checkSuiteId) {
              try {
                // Find the workflow run for this check suite
                const workflowRunsUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs?check_suite_id=${checkSuiteId}`;
                const workflowRunsResponse = await githubApiCall(token, workflowRunsUrl);

                if (workflowRunsResponse.workflow_runs && workflowRunsResponse.workflow_runs.length > 0) {
                  const workflowRunId = workflowRunsResponse.workflow_runs[0].id;

                  // Get jobs for this workflow run
                  const jobsUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${workflowRunId}/jobs`;
                  const jobsResponse = await githubApiCall(token, jobsUrl);

                  // Find the job that matches this check run name
                  const matchingJob = jobsResponse.jobs?.find((job: { name: string }) => job.name === run.name);

                  if (matchingJob && matchingJob.steps) {
                    // Find the failed step
                    const failedStepData = matchingJob.steps.find(
                      (step: { conclusion: string | null }) => step.conclusion === 'failure'
                    );

                    if (failedStepData) {
                      failedStep = failedStepData.name;

                      // If we don't have an error message yet, indicate which step failed
                      if (!errorMessage) {
                        errorMessage = `Step "${failedStepData.name}" failed`;
                      }
                    }
                  }
                }
              } catch (jobsError) {
                // Silently fail - we'll use whatever info we have from check output
              }
            }

            // Limit error message length to avoid huge payloads (max 500 chars)
            if (errorMessage && errorMessage.length > 500) {
              errorMessage = errorMessage.substring(0, 500) + '...';
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

// Get logs for a check run (job logs from GitHub Actions)
export async function getCheckLogs(token: string, owner: string, repo: string, checkRunId: number) {
  githubLogger.info(`Fetching logs for check run ${checkRunId}`);

  try {
    // Get the check run details
    const checkRunUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/check-runs/${checkRunId}`;
    const checkRun = await githubApiCall(token, checkRunUrl);

    const result: {
      checkName: string;
      conclusion: string;
      startedAt: string;
      completedAt: string;
      url: string;
      steps: Array<{
        name: string;
        status: string;
        conclusion: string | null;
        number: number;
      }>;
      annotations: Array<{
        path: string;
        startLine: number;
        endLine: number;
        level: string;
        message: string;
        title: string;
      }>;
      output: {
        title: string | null;
        summary: string | null;
      };
      logs: string | null;
    } = {
      checkName: checkRun.name,
      conclusion: checkRun.conclusion,
      startedAt: checkRun.started_at,
      completedAt: checkRun.completed_at,
      url: checkRun.html_url,
      steps: [],
      annotations: [],
      output: {
        title: checkRun.output?.title || null,
        summary: checkRun.output?.summary || null
      },
      logs: null
    };

    // Get annotations
    try {
      const annotationsUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/check-runs/${checkRunId}/annotations`;
      const annotations = await githubApiCall(token, annotationsUrl);
      result.annotations = annotations.map((a: {
        path: string;
        start_line: number;
        end_line: number;
        annotation_level: string;
        message: string;
        title: string;
      }) => ({
        path: a.path,
        startLine: a.start_line,
        endLine: a.end_line,
        level: a.annotation_level,
        message: a.message,
        title: a.title
      }));
    } catch {
      githubLogger.warn(`No annotations found for check ${checkRunId}`);
    }

    // Try to get job steps and logs from the workflow run
    const checkSuiteId = checkRun.check_suite?.id;
    if (checkSuiteId) {
      try {
        const workflowRunsUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs?check_suite_id=${checkSuiteId}`;
        const workflowRunsResponse = await githubApiCall(token, workflowRunsUrl);

        if (workflowRunsResponse.workflow_runs?.length > 0) {
          const workflowRunId = workflowRunsResponse.workflow_runs[0].id;
          const jobsUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${workflowRunId}/jobs`;
          const jobsResponse = await githubApiCall(token, jobsUrl);

          const matchingJob = jobsResponse.jobs?.find((job: { name: string }) => job.name === checkRun.name);
          if (matchingJob) {
            if (matchingJob.steps) {
              result.steps = matchingJob.steps.map((step: {
                name: string;
                status: string;
                conclusion: string | null;
                number: number;
              }) => ({
                name: step.name,
                status: step.status,
                conclusion: step.conclusion,
                number: step.number
              }));
            }

            // Fetch actual job logs
            try {
              const jobLogsUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/jobs/${matchingJob.id}/logs`;
              githubLogger.info(`Fetching job logs from: ${jobLogsUrl}`);

              const logsResponse = await axios.get(jobLogsUrl, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/vnd.github+json',
                  'User-Agent': 'track-current-task-app'
                },
                maxRedirects: 5,
                responseType: 'text'
              });

              if (logsResponse.data) {
                // Limit log size to avoid huge payloads (max 3MB, keep the end which has the error)
                const logText = logsResponse.data as string;
                const maxSize = 3000000;
                if (logText.length > maxSize) {
                  result.logs = '... (truncated, showing last 3MB) ...\n\n' + logText.substring(logText.length - maxSize);
                } else {
                  result.logs = logText;
                }
                githubLogger.info(`Fetched ${result.logs.length} chars of logs for job ${matchingJob.id}`);
              }
            } catch (logsError) {
              githubLogger.warn(`Could not fetch job logs for job ${matchingJob.id}: ${logsError}`);
            }
          }
        }
      } catch {
        githubLogger.warn(`Could not fetch job steps for check ${checkRunId}`);
      }
    }

    return result;
  } catch (error) {
    const axiosError = error as AxiosError;
    githubLogger.error(`Failed to fetch logs for check ${checkRunId}: ${axiosError?.response?.status || axiosError?.message}`);
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
// OPTIMIZED: Search user's pull requests using GraphQL (reduces 500+ API calls to 1-2 calls)
export async function searchUserPullRequests(token: string, taskIds: string[]) {
  githubLogger.info(`Searching PRs for ${taskIds.length} task IDs using GraphQL`);

  try {
    // Use GraphQL to fetch all PR data in a single query
    // This replaces 500+ REST API calls with just 1 GraphQL call!
    const query = `
      query($searchQuery: String!) {
        search(query: $searchQuery, type: ISSUE, first: 50) {
          nodes {
            ... on PullRequest {
              number
              title
              state
              isDraft
              url
              headRefName
              body
              createdAt
              updatedAt
              closedAt
              merged
              mergedAt
              comments {
                totalCount
              }
              reviews {
                totalCount
              }
              mergeable
              repository {
                name
                nameWithOwner
              }
              commits(last: 1) {
                nodes {
                  commit {
                    committedDate
                    statusCheckRollup {
                      state
                      contexts(first: 30) {
                        nodes {
                          ... on CheckRun {
                            databaseId
                            name
                            status
                            conclusion
                            detailsUrl
                          }
                          ... on StatusContext {
                            id
                            context
                            state
                            targetUrl
                          }
                        }
                      }
                    }
                  }
                }
              }
              latestReviews(first: 10) {
                nodes {
                  author {
                    login
                    avatarUrl
                  }
                  state
                  submittedAt
                }
              }
              reviewRequests(first: 10) {
                totalCount
                nodes {
                  requestedReviewer {
                    ... on User {
                      login
                      avatarUrl
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    // Get user login first to build search query
    const userQuery = `
      query {
        viewer {
          login
        }
      }
    `;

    interface UserResponse {
      viewer: {
        login: string;
      };
    }

    const userData = await githubGraphQLCall<UserResponse>(token, userQuery);
    const searchQuery = `author:${userData.viewer.login} type:pr sort:updated-desc`;

    interface GraphQLPRResponse {
      search: {
        nodes: Array<{
          number: number;
          title: string;
          state: string;
          isDraft: boolean;
          url: string;
          headRefName: string;
          body: string | null;
          createdAt: string;
          updatedAt: string;
          closedAt: string | null;
          merged: boolean;
          mergedAt: string | null;
          comments: { totalCount: number };
          reviews: { totalCount: number };
          mergeable: string;
          repository: {
            name: string;
            nameWithOwner: string;
          };
          commits: {
            nodes: Array<{
              commit: {
                committedDate: string;
                statusCheckRollup: {
                  state: string;
                  contexts: {
                    nodes: Array<{
                      databaseId?: number;
                      id?: string;
                      name?: string;
                      context?: string;
                      status?: string;
                      state?: string;
                      conclusion?: string | null;
                      detailsUrl?: string;
                      targetUrl?: string;
                    }>;
                  };
                } | null;
              };
            }>;
          };
          latestReviews: {
            nodes: Array<{
              author: {
                login: string;
                avatarUrl: string;
              } | null;
              state: string;
              submittedAt: string;
            }>;
          };
          reviewRequests: {
            totalCount: number;
            nodes: Array<{
              requestedReviewer: {
                login: string;
                avatarUrl: string;
              } | null;
            }>;
          };
        }>;
      };
    }

    const prData = await githubGraphQLCall<GraphQLPRResponse>(token, query, { searchQuery });

    // Filter and map PRs that match task IDs
    const matchingPRs = prData.search.nodes
      .map(pr => {
        const prTitle = pr.title || '';
        const prBody = pr.body || '';
        const headBranch = pr.headRefName || '';

        // Check if branch, title, or body contains any task ID
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

        // Get last review info
        const lastReview = pr.latestReviews.nodes[0];
        const changesRequested = lastReview?.state === 'CHANGES_REQUESTED';
        const lastReviewDate = lastReview?.submittedAt || null;
        const lastReviewState = lastReview?.state || null;

        // Get last commit date
        const lastCommit = pr.commits.nodes[0];
        const lastCommitDate = lastCommit?.commit.committedDate || null;

        // Parse check status from status rollup
        const statusRollup = lastCommit?.commit.statusCheckRollup;
        let checkStatus = {
          state: 'unknown',
          total: 0,
          passed: 0,
          failed: 0,
          pending: 0,
          checks: [] as Array<{
            id: number;
            name: string;
            status: string;
            conclusion: string | null;
            url: string;
            failedStep?: string | null;
            errorMessage?: string | null;
          }>
        };

        if (statusRollup) {
          checkStatus.state = statusRollup.state.toLowerCase();

          statusRollup.contexts.nodes.forEach(check => {
            const checkName = check.name || check.context || 'Unknown';
            const checkStatus_item = check.status || check.state || 'unknown';
            const conclusion = check.conclusion || (check.state === 'SUCCESS' ? 'SUCCESS' : check.state === 'FAILURE' ? 'FAILURE' : null);

            // databaseId is used for CheckRun (GitHub Actions), id is for StatusContext
            // Only CheckRun has databaseId, StatusContext uses a string id that can't be used for rerun
            const checkId = check.databaseId || 0;

            checkStatus.checks.push({
              id: checkId,
              name: checkName,
              status: checkStatus_item,
              conclusion: conclusion ? conclusion.toLowerCase() : null,
              url: check.detailsUrl || check.targetUrl || '',
              failedStep: null,
              errorMessage: null
            });

            checkStatus.total++;
            const conclusionUpper = conclusion?.toUpperCase();
            if (conclusionUpper === 'SUCCESS') {
              checkStatus.passed++;
            } else if (conclusionUpper === 'FAILURE') {
              checkStatus.failed++;
            } else if (conclusionUpper === 'SKIPPED' || conclusionUpper === 'CANCELLED' || conclusionUpper === 'NEUTRAL') {
              checkStatus.pending++;
            } else {
              checkStatus.pending++;
            }
          });
        }

        // Parse review status
        // Group reviews by user, keeping only the most recent review from each reviewer
        const reviewsByUser = new Map();
        pr.latestReviews.nodes.forEach(review => {
          // Skip reviews without author (e.g., from deleted users)
          if (!review.author) return;

          const login = review.author.login;
          const existingReview = reviewsByUser.get(login);

          if (!existingReview || new Date(review.submittedAt) > new Date(existingReview.submittedAt)) {
            reviewsByUser.set(login, review);
          }
        });

        // Convert to array with proper format
        const reviewers = Array.from(reviewsByUser.values())
          .filter(review => review.author) // Extra safety filter
          .map(review => ({
            login: review.author.login,
            avatarUrl: review.author.avatarUrl,
            state: review.state
          }));

        // Determine overall review state
        const hasChangesRequested = reviewers.some(r => r.state === 'CHANGES_REQUESTED');
        const hasApproved = reviewers.some(r => r.state === 'APPROVED');
        const allApproved = reviewers.every(r => r.state === 'APPROVED');

        let reviewState = 'no_reviews';
        if (hasChangesRequested) {
          reviewState = 'changes_requested';
        } else if (allApproved && reviewers.length > 0) {
          reviewState = 'approved';
        } else if (hasApproved) {
          reviewState = 'partial_approval';
        } else if (reviewers.length > 0) {
          reviewState = 'commented';
        }

        const reviewStatus = {
          reviewers,
          state: reviewState,
          approved: hasApproved,
          changesRequested: hasChangesRequested,
          pendingReviews: pr.reviewRequests.totalCount,
          totalReviews: pr.reviews.totalCount
        };

        return {
          taskId: matchedTaskId,
          number: pr.number,
          title: pr.title,
          state: pr.state.toLowerCase(),
          draft: pr.isDraft,
          url: pr.url,
          branch: headBranch,
          repository: {
            name: pr.repository.name,
            fullName: pr.repository.nameWithOwner
          },
          createdAt: pr.createdAt,
          updatedAt: pr.updatedAt,
          merged: pr.merged,
          mergedAt: pr.mergedAt,
          comments: pr.comments.totalCount,
          reviewComments: pr.reviews.totalCount,
          changesRequested,
          lastCommitDate,
          lastReviewDate,
          lastReviewState,
          mergeable: pr.mergeable,
          mergeableState: pr.mergeable,
          checkStatus,
          reviewStatus
        };
      })
      .filter((pr): pr is NonNullable<typeof pr> => pr !== null);

    githubLogger.info(`Found ${matchingPRs.length} matching PRs using GraphQL`);

    // Enrich failed checks with detailed error information (async)
    const failedCheckPRs = matchingPRs.filter(pr =>
      pr.checkStatus?.checks?.some(c =>
        ['failure', 'timed_out', 'action_required'].includes(c.conclusion || '')
      )
    );

    if (failedCheckPRs.length > 0) {
      githubLogger.info(`Fetching details for ${failedCheckPRs.length} PRs with failed checks`);

      await Promise.all(failedCheckPRs.map(async (pr) => {
        const [owner, repo] = pr.repository.fullName.split('/');

        await Promise.all(pr.checkStatus!.checks.map(async (check) => {
          if (!check.id || !['failure', 'timed_out', 'action_required'].includes(check.conclusion || '')) {
            return;
          }

          githubLogger.info(`Fetching details for failed check: ${check.name} (ID: ${check.id})`);

          try {
            // First, try to get annotations - these contain the actual error messages
            const annotationsUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/check-runs/${check.id}/annotations`;
            const annotations = await githubApiCall(token, annotationsUrl);

            if (annotations && annotations.length > 0) {
              const failureAnnotation = annotations.find(
                (a: { annotation_level: string }) => a.annotation_level === 'failure'
              ) || annotations[0];

              if (failureAnnotation) {
                check.errorMessage = failureAnnotation.message || failureAnnotation.raw_details || null;
                githubLogger.info(`Found annotation for ${check.name}: ${check.errorMessage?.substring(0, 100)}...`);
              }
            }
          } catch (annotationError) {
            githubLogger.warn(`Failed to fetch annotations for check ${check.id}`);
          }

          try {
            const checkDetailUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/check-runs/${check.id}`;
            const checkDetail = await githubApiCall(token, checkDetailUrl);

            // Get error from check output if we don't have annotation
            if (!check.errorMessage && (checkDetail.output?.summary || checkDetail.output?.title)) {
              check.errorMessage = checkDetail.output?.summary || checkDetail.output?.title || null;
              githubLogger.info(`Found output for ${check.name}: ${check.errorMessage?.substring(0, 100)}...`);
            }

            // Try to get the failed step from the job
            const checkSuiteId = checkDetail.check_suite?.id;
            if (checkSuiteId) {
              try {
                const workflowRunsUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs?check_suite_id=${checkSuiteId}`;
                const workflowRunsResponse = await githubApiCall(token, workflowRunsUrl);

                if (workflowRunsResponse.workflow_runs?.length > 0) {
                  const workflowRunId = workflowRunsResponse.workflow_runs[0].id;
                  const jobsUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${workflowRunId}/jobs`;
                  const jobsResponse = await githubApiCall(token, jobsUrl);

                  const matchingJob = jobsResponse.jobs?.find((job: { name: string }) => job.name === check.name);
                  if (matchingJob?.steps) {
                    const failedStepData = matchingJob.steps.find(
                      (step: { conclusion: string | null }) => step.conclusion === 'failure'
                    );
                    if (failedStepData) {
                      check.failedStep = failedStepData.name;
                      githubLogger.info(`Found failed step for ${check.name}: ${check.failedStep}`);
                      if (!check.errorMessage) {
                        check.errorMessage = `Step "${failedStepData.name}" failed`;
                      }
                    }
                  }
                }
              } catch {
                // Silently fail - use whatever info we have
              }
            }
          } catch {
            githubLogger.warn(`Failed to fetch check details for ${check.id}`);
          }

          // Limit error message length
          if (check.errorMessage && check.errorMessage.length > 500) {
            check.errorMessage = check.errorMessage.substring(0, 500) + '...';
          }
        }));
      }));
    }

    return matchingPRs;
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

// Search for branches matching a task ID (OPTIMIZED - uses GraphQL to fetch all data in 2 API calls)
export async function searchBranchesForTaskId(token: string, taskId: string) {
  try {
    // STEP 1: Get list of repos where user has been active (1 GraphQL call)
    // Priority: repos with open PRs first, then recently pushed repos
    const reposQuery = `
      query {
        viewer {
          login
          repositories(
            first: 75,
            orderBy: {field: PUSHED_AT, direction: DESC},
            affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER],
            ownerAffiliations: [OWNER, ORGANIZATION_MEMBER, COLLABORATOR]
          ) {
            nodes {
              name
              nameWithOwner
              defaultBranchRef {
                name
              }
            }
          }
        }
        search(query: "is:pr author:@me state:open", type: ISSUE, first: 100) {
          nodes {
            ... on PullRequest {
              repository {
                name
                nameWithOwner
                defaultBranchRef {
                  name
                }
              }
            }
          }
        }
      }
    `;

    interface RepoNode {
      name: string;
      nameWithOwner: string;
      defaultBranchRef: { name: string } | null;
    }

    interface ReposResponse {
      viewer: {
        login: string;
        repositories: {
          nodes: RepoNode[];
        };
      };
      search: {
        nodes: Array<{
          repository: RepoNode;
        }>;
      };
    }

    const reposData = await githubGraphQLCall<ReposResponse>(token, reposQuery);

    // Debug: Log PR search results
    githubLogger.info(`Found ${reposData.search.nodes.length} open PRs for user`);
    const prRepos = reposData.search.nodes
      .filter(pr => pr.repository)
      .map(pr => pr.repository.nameWithOwner);
    if (prRepos.length > 0) {
      githubLogger.info(`PR repositories: ${prRepos.join(', ')}`);
    }

    // Combine repos from open PRs (priority) with recently pushed repos
    const repoMap = new Map<string, RepoNode>();

    // First, add repos where user has open PRs (highest priority)
    reposData.search.nodes.forEach(pr => {
      if (pr.repository) {
        repoMap.set(pr.repository.nameWithOwner, pr.repository);
      }
    });

    const prRepoCount = repoMap.size;

    // Then, add recently pushed repos as fallback (lower priority)
    reposData.viewer.repositories.nodes.forEach(repo => {
      if (!repoMap.has(repo.nameWithOwner)) {
        repoMap.set(repo.nameWithOwner, repo);
      }
    });

    // Convert to array and limit to 50 total repos (balancing coverage vs query size)
    const repos = Array.from(repoMap.values()).slice(0, 50);

    if (repos.length === 0) {
      githubLogger.info(`No repositories found for branch search`);
      return [];
    }

    githubLogger.info(`Searching for task ${taskId} in ${repos.length} repositories (${prRepoCount} with open PRs, ${repos.length - prRepoCount} recently pushed): ${repos.map(r => r.nameWithOwner).join(', ')}`);

    // STEP 2: Build a single GraphQL query with aliases to fetch branches from all repos (1 GraphQL call)
    // This replaces 15 separate REST API calls with 1 GraphQL call!
    const branchesQueryParts: string[] = [];

    repos.forEach((repo, index) => {
      const [owner, repoName] = repo.nameWithOwner.split('/');
      branchesQueryParts.push(`
        repo${index}: repository(owner: "${owner}", name: "${repoName}") {
          nameWithOwner
          defaultBranchRef {
            name
          }
          refs(refPrefix: "refs/heads/", first: 75) {
            nodes {
              name
            }
          }
        }
      `);
    });

    const branchesQuery = `
      query {
        ${branchesQueryParts.join('\n')}
      }
    `;

    interface BranchNode {
      name: string;
    }

    interface RepositoryData {
      nameWithOwner: string;
      defaultBranchRef: { name: string } | null;
      refs: {
        nodes: BranchNode[];
      };
    }

    type BranchesResponse = Record<string, RepositoryData>;

    const branchesData = await githubGraphQLCall<BranchesResponse>(token, branchesQuery);

    // STEP 3: Filter branches that match the task ID
    const matchingBranches = [];
    let reposSearched = 0;

    for (const [_key, repoData] of Object.entries(branchesData)) {
      if (!repoData || !repoData.refs) continue;

      reposSearched++;
      const defaultBranch = repoData.defaultBranchRef?.name || 'main';
      const branchNames = repoData.refs.nodes.map(b => b.name);

      // Log branches for debugging (first 10 branches per repo)
      if (branchNames.length > 0) {
        githubLogger.debug(`${repoData.nameWithOwner}: ${branchNames.length} branches (showing first 10): ${branchNames.slice(0, 10).join(', ')}`);
      }

      for (const branch of repoData.refs.nodes) {
        // Check if branch name contains the task ID (case insensitive)
        if (branch.name.toLowerCase().includes(taskId.toLowerCase())) {
          const [owner, repoName] = repoData.nameWithOwner.split('/');
          githubLogger.info(`Found matching branch: ${repoData.nameWithOwner}:${branch.name}`);
          matchingBranches.push({
            name: branch.name,
            repository: {
              name: repoName,
              fullName: repoData.nameWithOwner
            },
            createPrUrl: `https://github.com/${repoData.nameWithOwner}/compare/${defaultBranch}...${branch.name}?expand=1`,
            lastCommitDate: null
          });
        }
      }
    }

    githubLogger.info(`Found ${matchingBranches.length} branches for task ${taskId} (searched ${reposSearched} repos using GraphQL - 2 API calls total)`);
    if (matchingBranches.length > 0) {
      githubLogger.info(`Matching branches: ${matchingBranches.map(b => `${b.repository.fullName}:${b.name}`).join(', ')}`);
    }
    return matchingBranches;
  } catch (error) {
    const axiosError = error as AxiosError;
    githubLogger.warn(`Failed to search branches for task ${taskId}: ${axiosError?.response?.status || axiosError?.message}`);
    return [];
  }
}