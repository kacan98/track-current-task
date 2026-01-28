// Jira-related type definitions

export interface Subtask {
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
  };
}

export interface JiraIssueLink {
  type: {
    name: string;
    inward: string;
    outward: string;
  };
  inwardIssue?: {
    key: string;
    fields: {
      summary: string;
      status: {
        name: string;
      };
    };
  };
  outwardIssue?: {
    key: string;
    fields: {
      summary: string;
      status: {
        name: string;
      };
    };
  };
}

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
      statusCategory: {
        name: string;
        colorName: string;
      };
    };
    priority?: {
      name: string;
    };
    issuetype: {
      name: string;
    };
    subtasks?: Subtask[];
    issuelinks?: JiraIssueLink[];
  };
}

export interface LinkedIssue {
  key: string;
  summary: string;
  status: string;
}
