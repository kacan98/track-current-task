// GitHub-related type definitions

export interface Reviewer {
  login: string;
  avatarUrl: string;
  state: string;
}

export interface ReviewStatus {
  reviewers: Reviewer[];
  state: 'no_reviews' | 'changes_requested' | 'approved' | 'partial_approval' | 'commented';
}

export interface Check {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  url: string;
  failedStep?: string | null;
  errorMessage?: string | null;
}

export interface CheckStatus {
  state: string;
  total: number;
  passed: number;
  failed: number;
  pending: number;
  checks: Check[];
}

export interface PullRequest {
  taskId: string;
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
  merged: boolean;
  mergedAt?: string;
  comments: number;
  reviewComments: number;
  changesRequested: boolean;
  lastCommitDate?: string | null;
  lastReviewDate?: string | null;
  lastReviewState?: string | null;
  mergeable?: boolean | null;
  mergeableState?: string;
  checkStatus?: CheckStatus;
  reviewStatus?: ReviewStatus;
}

export interface Branch {
  name: string;
  repository: {
    name: string;
    fullName: string;
  };
  createPrUrl: string;
  lastCommitDate?: string | null;
}
