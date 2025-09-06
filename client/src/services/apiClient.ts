import { API_ROUTES } from '@shared/apiRoutes';

// Base configuration for API calls
const API_PREFIX = '/api';

// Helper to build full API URLs
export const buildApiUrl = (route: string): string => {
  // Ensure route starts with /
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  return `${API_PREFIX}${normalizedRoute}`;
};

// Generic fetch wrapper with common options
export const apiFetch = async (
  route: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const url = buildApiUrl(route);
  
  // Merge default options
  const defaultOptions: RequestInit = {
    credentials: 'include', // Always include cookies for auth
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  return fetch(url, { ...defaultOptions, ...options });
};

// Typed API methods
export const api = {
  // Generic GET
  get: async (route: string) => {
    return apiFetch(route, { method: 'GET' });
  },

  // Generic POST  
  post: async (route: string, data?: unknown) => {
    return apiFetch(route, {
      method: 'POST',
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
  },

  // Jira specific methods
  jira: {
    login: (login: string, password: string, jiraUrl: string, name: string = 'LogBridge') =>
      api.post(API_ROUTES.JIRA.AUTH.LOGIN, { login, password, jiraUrl, name }),
    
    loginWithToken: (token: string, jiraUrl: string, name: string = 'LogBridge') =>
      api.post(API_ROUTES.JIRA.AUTH.LOGIN_TOKEN, { token, jiraUrl, name }),
    
    logout: () => 
      api.post(API_ROUTES.JIRA.AUTH.LOGOUT),
    
    getStatus: () =>
      api.get(API_ROUTES.JIRA.AUTH.STATUS),
    
    logWork: (issueKey: string, timeSpentSeconds: number, started: string, comment: string = '') =>
      api.post(API_ROUTES.JIRA.LOGWORK, { issueKey, timeSpentSeconds, started, comment }),
    
    getIssuesDetails: (issueKeys: string[]) =>
      api.post(API_ROUTES.JIRA.ISSUES_DETAILS, { issueKeys }),
    
    getWorklogsDetails: (worklogIds: number[]) =>
      api.post(API_ROUTES.JIRA.WORKLOGS_DETAILS, { worklogIds }),
  },

  // GitHub specific methods
  github: {
    loginWithPAT: (token: string) =>
      api.post(API_ROUTES.GITHUB.AUTH.PAT, { token }),
    
    loginWithOAuth: (code: string) =>
      api.post(API_ROUTES.GITHUB.AUTH.OAUTH, { code }),
    
    logout: () => 
      api.post(API_ROUTES.GITHUB.AUTH.LOGOUT),
    
    getStatus: () =>
      api.get(API_ROUTES.GITHUB.AUTH.STATUS),
    
    getCommits: (date: string) =>
      api.get(`${API_ROUTES.GITHUB.COMMITS}?date=${date}`),
  },

  // Files specific methods
  files: {
    getActivityLog: () =>
      api.get(API_ROUTES.FILES.ACTIVITY_LOG),
  }
};