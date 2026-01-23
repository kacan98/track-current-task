// GitHub API types for better type safety

export interface GitHubAuthRequest {
  code: string;
  state?: string;
}

export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

export interface GitHubCommit {
  sha: string;
  shortSha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  repository: {
    name: string;
    full_name: string;
  };
  url: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  branch: string;
  pullRequest: {
    number: number;
    title: string;
    branchDeleted: boolean;
    url: string;
  } | null;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
  };
}

export interface GitHubCommitsRequest {
  date: string; // YYYY-MM-DD format
}

export interface GitHubErrorResponse {
  message: string;
  documentation_url?: string;
}

export interface GitHubBranchSearchRequest {
  taskIds: string[]; // e.g., ['PROJ-123', 'PROJ-456']
}

export interface GitHubBranch {
  name: string;
  repository: {
    name: string;
    fullName: string;
  };
  url: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: string;
  draft: boolean;
  url: string;
  branch: string;
  repository: {
    name: string;
    fullName: string;
  };
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
}