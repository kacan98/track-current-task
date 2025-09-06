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
    COMMITS: '/github/commits'
  },
  FILES: {
    ACTIVITY_LOG: '/activity-log'
  }
} as const;