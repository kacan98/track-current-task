// Jira API types for better type safety

export interface JiraLogWorkRequest {
  issueKey: string;
  timeSpentSeconds: number;
  started: string;
  comment?: string;
  visibility?: {
    type: 'group' | 'role';
    value: string;
  };
  notifyUsers?: boolean;
  adjustEstimate?: 'new' | 'leave' | 'manual' | 'auto';
  newEstimate?: string;
  reduceBy?: string;
  expand?: string;
  overrideEditableFlag?: boolean;
}

export interface JiraLogWorkQueryParams {
  notifyUsers?: boolean;
  adjustEstimate?: 'new' | 'leave' | 'manual' | 'auto';
  newEstimate?: string;
  reduceBy?: string;
  expand?: string;
  overrideEditableFlag?: boolean;
}

export interface JiraLogWorkPayload {
  comment: string;
  started: string;
  timeSpentSeconds: number;
  visibility?: {
    type: 'group' | 'role';
    value: string;
  };
}

export interface JiraIssuesRequest {
  issueKeys: string[];
  jql?: string;
  fields?: string[];
}

export interface JiraWorklogsRequest {
  worklogIds: number[];
}

export interface JiraAuthRequest {
  login: string;
  password: string;
  jiraUrl: string;
  name?: string;
}

export interface JiraTokenAuthRequest {
  token: string;
  jiraUrl: string;
  name?: string;
}

export interface JiraTokenResponse {
  rawToken: string;
  // Add other fields as needed
}

export interface JiraErrorResponse {
  errorMessages?: string[];
  message?: string;
  errors?: Record<string, string>;
}