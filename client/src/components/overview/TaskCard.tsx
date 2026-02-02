import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/services/apiClient';
import { BranchCard } from './BranchCard';
import { TestingAlert } from './TestingAlert';
import { JiraIssueDisplay } from './JiraIssueDisplay';
import { LinkedIssuesList } from './LinkedIssuesList';
import { PullRequestCard } from './PullRequestCard';
import { MergedPRsList } from './MergedPRsList';
import { getTimeAgo } from '@/utils/timeUtils';
import type { JiraIssue, LinkedIssue } from '@shared/jira.model';
import type { PullRequest, Branch } from '@shared/github.model';

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
  onBranchesFound?: ((taskKey: string, branches: Branch[]) => void) | undefined;
  onCheckRerun?: (() => void) | undefined;
  loadingPRs?: boolean | undefined;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  issue,
  linkedIssues,
  pullRequests,
  jiraBaseUrl,
  expandedMergedPRs,
  onToggleMergedPRs,
  onBranchesFound,
  onCheckRerun,
  loadingPRs,
}) => {
  const [matchingBranches, setMatchingBranches] = useState<Branch[] | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const hasFetchedBranches = useRef(false);

  // Search for branches when there are no PRs
  useEffect(() => {
    const noPRs = pullRequests.open.length === 0 && pullRequests.merged.length === 0;

    if (!noPRs || hasFetchedBranches.current) return;

    hasFetchedBranches.current = true;
    setLoadingBranches(true);

    api.github.searchBranches(issue.key)
      .then(response => response.json())
      .then(data => {
        const branches = data.branches || [];
        setMatchingBranches(branches);

        // Notify parent component about branches found
        if (onBranchesFound && branches.length > 0) {
          onBranchesFound(issue.key, branches);
        }
      })
      .catch(error => {
        console.error('Failed to search for branches:', error);
        setMatchingBranches([]);
      })
      .finally(() => {
        setLoadingBranches(false);
      });
  }, [issue.key, pullRequests.open.length, pullRequests.merged.length]);

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

  const hasTestSubtaskPending = () => {
    if (!issue.fields.subtasks || issue.fields.subtasks.length === 0) {
      return false;
    }

    // Check if all PRs are merged
    const allPRsMerged = pullRequests.open.length === 0 && pullRequests.merged.length > 0;

    if (!allPRsMerged) {
      return false;
    }

    // Check if there's a test subtask in "To Do" state
    return issue.fields.subtasks.some(subtask => {
      const summaryLower = subtask.fields.summary.toLowerCase();
      const statusLower = subtask.fields.status.name.toLowerCase();
      return summaryLower.includes('test') &&
             (statusLower === 'to do' || statusLower === 'todo' || statusLower.includes('backlog'));
    });
  };

  const needsTestingAlert = hasTestSubtaskPending();

  return (
    <div className="bg-white rounded-lg border border-gray-300 shadow-md p-6 hover:shadow-xl transition-shadow">
      <TestingAlert show={needsTestingAlert} />

      {/* Main task and linked tasks */}
      <div className="mb-4 space-y-3">
        <JiraIssueDisplay
          issue={issue}
          jiraBaseUrl={jiraBaseUrl}
          getStatusBadgeColor={getStatusBadgeColor}
        />
        <LinkedIssuesList
          linkedIssues={linkedIssues}
          jiraBaseUrl={jiraBaseUrl}
          getStatusBadgeColor={getStatusBadgeColor}
        />
      </div>

      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="text-sm font-semibold text-gray-700 mb-2">Pull Requests</div>

        {loadingPRs && pullRequests.open.length === 0 && pullRequests.merged.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-500 py-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            <span className="text-sm">Loading PRs...</span>
          </div>
        ) : pullRequests.open.length === 0 && pullRequests.merged.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
            <p className="text-sm text-gray-700">No PRs found</p>

            {loadingBranches ? (
              <p className="text-xs text-gray-500">Searching for branches...</p>
            ) : matchingBranches && matchingBranches.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-600">Found {matchingBranches.length} branch{matchingBranches.length !== 1 ? 'es' : ''}:</p>
                {matchingBranches.map((branch, idx) => (
                  <BranchCard
                    key={idx}
                    branch={branch}
                    taskKey={issue.key}
                    jiraBaseUrl={jiraBaseUrl}
                    relatedPRs={[...pullRequests.open, ...pullRequests.merged]}
                    getTimeAgo={getTimeAgo}
                  />
                ))}
              </div>
            ) : matchingBranches !== null && (
              <p className="text-xs text-gray-500">
                Missing PRs? Check{' '}
                <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  SSO access
                </a>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {pullRequests.open.map((pr) => {
              // Find related PRs with the same task ID
              const relatedPRs = pullRequests.open.filter(
                otherPr => otherPr.number !== pr.number && otherPr.taskId === pr.taskId
              );

              return (
                <PullRequestCard
                  key={pr.number}
                  pr={pr}
                  relatedPRs={relatedPRs}
                  jiraBaseUrl={jiraBaseUrl}
                  getPRStateBadgeColor={getPRStateBadgeColor}
                  getPRStateLabel={getPRStateLabel}
                  getTimeAgo={getTimeAgo}
                  shouldShowChangesRequested={shouldShowChangesRequested}
                  hasConflicts={hasConflicts}
                  getCheckStatusIcon={getCheckStatusIcon}
                  onCheckRerun={onCheckRerun}
                />
              );
            })}

            <MergedPRsList
              mergedPRs={pullRequests.merged}
              isExpanded={expandedMergedPRs.has(issue.key)}
              onToggle={() => onToggleMergedPRs(issue.key)}
              getPRStateBadgeColor={getPRStateBadgeColor}
              getPRStateLabel={getPRStateLabel}
            />
          </div>
        )}
      </div>
    </div>
  );
};
