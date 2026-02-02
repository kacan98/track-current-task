// Shared API route constants between frontend and backend
export const API_ROUTES = {
  JIRA: {
    AUTH: {
      LOGIN: '/jira/auth/login',
      LOGIN_TOKEN: '/jira/auth/login-token',
      LOGOUT: '/jira/auth/logout', 
      STATUS: '/jira/auth/status'
    },
    LOGWORK: '/jira/logwork',
    ISSUES_DETAILS: '/jira/issues/details',
    WORKLOGS_DETAILS: '/jira/worklogs/details'
  },
  GITHUB: {
    AUTH: {
      PAT: '/github/auth/pat',
      OAUTH: '/github/auth',
      LOGOUT: '/github/auth/logout',
      STATUS: '/github/auth/status'
    },
    COMMITS: '/github/commits',
    BRANCHES_SEARCH: '/github/branches/search',
    RERUN_CHECK: (owner: string, repo: string, checkRunId: number) => `/github/checks/${owner}/${repo}/${checkRunId}/rerun`,
    CHECK_LOGS: (owner: string, repo: string, checkRunId: number) => `/github/checks/${owner}/${repo}/${checkRunId}/logs`,
    REQUEST_REVIEW: (owner: string, repo: string, prNumber: number) => `/github/pulls/${owner}/${repo}/${prNumber}/request-review`
  },
  FILES: {
    ACTIVITY_LOG: '/activity-log'
  }
} as const;