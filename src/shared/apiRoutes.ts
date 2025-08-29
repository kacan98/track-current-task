// Shared API route constants between frontend and backend
export const API_ROUTES = {
  JIRA: {
    AUTH: {
      LOGIN: '/jira/auth/login',
      LOGOUT: '/jira/auth/logout', 
      STATUS: '/jira/auth/status'
    },
    LOGWORK: '/jira/logwork',
    ISSUES_DETAILS: '/jira/issues/details',
    WORKLOGS_DETAILS: '/jira/worklogs/details'
  },
  FILES: {
    ACTIVITY_LOG: '/activity-log'
  }
} as const;