import React, { useState } from 'react';
import { Badge } from '@/components/ui/Badge';

interface Subtask {
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
  };
}

interface JiraIssue {
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
  };
}

interface LinkedIssue {
  key: string;
  summary: string;
  status: string;
}

interface PullRequest {
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
  checkStatus?: {
    state: string;
    total: number;
    passed: number;
    failed: number;
    pending: number;
  };
}

interface TaskCardProps {
  issue: JiraIssue;
  linkedIssues: LinkedIssue[];
  pullRequests: {
    open: PullRequest[];
    merged: PullRequest[];
  };
  jiraBaseUrl: string;
  expandedMergedPRs: Set<string>;
  onToggleMergedPRs: (taskKey: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  issue,
  linkedIssues,
  pullRequests,
  jiraBaseUrl,
  expandedMergedPRs,
  onToggleMergedPRs,
}) => {
  const [showAllLinkedTasks, setShowAllLinkedTasks] = useState(false);
  const getStatusBadgeColor = (statusName: string) => {
    const statusLower = statusName.toLowerCase();
    // Check if it's an "In Progress" status
    if (statusLower.includes('progress') || statusLower.includes('in progress')) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    }
    // Check if it's a "Done" status
    if (statusLower.includes('done') || statusLower.includes('complete')) {
      return 'bg-green-100 text-green-800 border-green-300';
    }
    // Default (To Do, Ready, etc.)
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getPRStateBadgeColor = (pr: PullRequest) => {
    if (pr.merged) {
      return 'bg-purple-100 text-purple-800 border-purple-300';
    }
    if (pr.draft) {
      return 'bg-gray-100 text-gray-600 border-gray-300';
    }
    if (pr.state === 'open') {
      return 'bg-green-100 text-green-800 border-green-300';
    }
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getPRStateLabel = (pr: PullRequest) => {
    if (pr.merged) return 'Merged';
    if (pr.draft) return 'Draft';
    if (pr.state === 'open') return 'Open';
    return 'Closed';
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const shouldShowChangesRequested = (pr: PullRequest) => {
    if (!pr.changesRequested) return false;
    if (!pr.lastCommitDate || !pr.lastReviewDate) return true;

    // Only show "changes requested" if last review was after last commit
    const lastCommit = new Date(pr.lastCommitDate);
    const lastReview = new Date(pr.lastReviewDate);
    return lastReview > lastCommit;
  };

  const hasConflicts = (pr: PullRequest) => {
    return pr.mergeable === false;
  };

  const getCheckStatusIcon = (state: string) => {
    switch (state) {
      case 'success':
        return { icon: 'check_circle', color: 'text-green-600' };
      case 'failure':
        return { icon: 'cancel', color: 'text-red-600' };
      case 'pending':
        return { icon: 'schedule', color: 'text-yellow-600' };
      case 'none':
      case 'unknown':
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-300 shadow-md p-6 hover:shadow-xl transition-shadow">
      {/* Main task and linked tasks */}
      <div className="mb-4 space-y-3">
        {/* Main task */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <a
              href={`${jiraBaseUrl}/browse/${issue.key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-mono text-sm font-semibold"
            >
              {issue.key}
            </a>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                issue.fields.status.name
              )}`}
            >
              {issue.fields.status.name}
            </span>
          </div>
          <div className="text-sm text-gray-700">
            {issue.fields.summary}
          </div>

          {/* Subtasks */}
          {issue.fields.subtasks && issue.fields.subtasks.length > 0 && (
            <div className="mt-2 ml-4 space-y-1">
              {issue.fields.subtasks.map((subtask) => (
                <div key={subtask.key} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">└─</span>
                  <a
                    href={`${jiraBaseUrl}/browse/${subtask.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-mono font-semibold"
                  >
                    {subtask.key}
                  </a>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                    {subtask.fields.status.name}
                  </span>
                  <span className="text-gray-600 truncate flex-1">{subtask.fields.summary}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Linked tasks - show only "In Progress" by default */}
        {linkedIssues.length > 0 && (() => {
          const inProgressLinked = linkedIssues.filter(linked =>
            linked.status.toLowerCase().includes('progress') ||
            linked.status.toLowerCase().includes('in progress')
          );
          const otherLinked = linkedIssues.filter(linked =>
            !linked.status.toLowerCase().includes('progress') &&
            !linked.status.toLowerCase().includes('in progress')
          );

          return (
            <>
              {inProgressLinked.map((linked) => (
                <div key={linked.key} className="border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <a
                      href={`${jiraBaseUrl}/browse/${linked.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-mono text-sm font-semibold"
                    >
                      {linked.key}
                    </a>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(linked.status)}`}>
                      {linked.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700">
                    {linked.summary}
                  </div>
                </div>
              ))}

              {/* Collapsible other tasks */}
              {otherLinked.length > 0 && (
                <>
                  <div className="border-t border-gray-200 pt-3">
                    <button
                      onClick={() => setShowAllLinkedTasks(!showAllLinkedTasks)}
                      className="w-full text-left text-xs text-gray-600 hover:text-gray-800 py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded transition-colors flex items-center justify-between"
                    >
                      <span>
                        {showAllLinkedTasks ? '▼' : '▶'} Other Linked Tasks ({otherLinked.length})
                      </span>
                    </button>
                  </div>

                  {showAllLinkedTasks && otherLinked.map((linked) => (
                    <div key={linked.key} className="border-t border-gray-200 pt-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <a
                          href={`${jiraBaseUrl}/browse/${linked.key}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-mono text-sm font-semibold"
                        >
                          {linked.key}
                        </a>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(linked.status)}`}>
                          {linked.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">
                        {linked.summary}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          );
        })()}
      </div>

      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="text-sm font-semibold text-gray-700 mb-2">Pull Requests</div>

        {pullRequests.open.length === 0 && pullRequests.merged.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-gray-700 mb-2">No PRs found for this task.</p>
            <p className="text-xs text-gray-600">
              <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
              If you have PRs but they're not showing up, you may need to authorize SSO for your GitHub Personal Access Token.
              Visit{' '}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                GitHub Settings → Personal access tokens
              </a>
              {' '}and click "Configure SSO" next to your token.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pullRequests.open.map((pr) => {
              const totalComments = pr.comments + pr.reviewComments;
              const showChangesRequested = shouldShowChangesRequested(pr);
              const prHasConflicts = hasConflicts(pr);
              const checkStatusInfo = pr.checkStatus ? getCheckStatusIcon(pr.checkStatus.state) : null;
              return (
                <a
                  key={pr.number}
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block p-3 rounded border transition-colors ${
                    prHasConflicts
                      ? 'bg-red-50 border-red-300 hover:border-red-400 hover:bg-red-100'
                      : showChangesRequested
                      ? 'bg-orange-50 border-orange-300 hover:border-orange-400 hover:bg-orange-100'
                      : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900 line-clamp-1 flex-1">
                        {pr.title}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${getPRStateBadgeColor(
                          pr
                        )}`}
                      >
                        {getPRStateLabel(pr)}
                      </span>
                    </div>
                    {(prHasConflicts || showChangesRequested) && (
                      <div className="flex items-center gap-2">
                        {prHasConflicts && (
                          <Badge variant="danger" icon="warning">
                            Merge Conflicts
                          </Badge>
                        )}
                        {!prHasConflicts && showChangesRequested && (
                          <Badge variant="warning" icon="warning">
                            Changes Requested
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-2 flex-wrap">
                    <span>#{pr.number} • {pr.repository.name}</span>
                    {totalComments > 0 && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>comment</span>
                        {totalComments} comment{totalComments !== 1 ? 's' : ''}
                      </span>
                    )}
                    {checkStatusInfo && pr.checkStatus && (
                      <span className={`text-xs flex items-center gap-1 ${checkStatusInfo.color}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{checkStatusInfo.icon}</span>
                        {pr.checkStatus.state === 'success' && `${pr.checkStatus.passed}/${pr.checkStatus.total} checks passed`}
                        {pr.checkStatus.state === 'failure' && `${pr.checkStatus.failed}/${pr.checkStatus.total} checks failed`}
                        {pr.checkStatus.state === 'pending' && `${pr.checkStatus.pending}/${pr.checkStatus.total} checks pending`}
                      </span>
                    )}
                  </div>

                  {/* Show timing info if available */}
                  {(pr.lastCommitDate || pr.lastReviewDate) && (
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                      {pr.lastReviewDate && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>rate_review</span>
                          Last review: {getTimeAgo(pr.lastReviewDate)}
                        </span>
                      )}
                      {pr.lastCommitDate && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>commit</span>
                          Last commit: {getTimeAgo(pr.lastCommitDate)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-1 font-mono truncate">
                    {pr.branch}
                  </div>
                </a>
              );
            })}

            {/* Merged PRs - collapsible */}
            {pullRequests.merged.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => onToggleMergedPRs(issue.key)}
                  className="w-full text-left text-xs text-gray-600 hover:text-gray-800 py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded transition-colors flex items-center justify-between"
                >
                  <span>
                    {expandedMergedPRs.has(issue.key) ? '▼' : '▶'} Merged PRs ({pullRequests.merged.length})
                  </span>
                </button>

                {expandedMergedPRs.has(issue.key) && (
                  <div className="mt-2 space-y-2">
                    {pullRequests.merged.map((pr) => (
                      <a
                        key={pr.number}
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-gray-50 rounded border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors opacity-75"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 line-clamp-1 flex-1">
                            {pr.title}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${getPRStateBadgeColor(
                              pr
                            )}`}
                          >
                            {getPRStateLabel(pr)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          #{pr.number} • {pr.repository.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 font-mono truncate">
                          {pr.branch}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
