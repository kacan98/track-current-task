import React, { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/Badge';
import { BranchCard } from './BranchCard';
import { FailedCheckItem } from './FailedCheckItem';
import { Skeleton } from '@/components/ui/Skeleton';
import { getTimeAgo } from '@/utils/timeUtils';
import { API_ROUTES } from '@shared/apiRoutes';
import { useToastContext } from '@/contexts/ToastContext';
import type { JiraIssue } from '@shared/jira.model';
import type { PullRequest, Branch, Check } from '@shared/github.model';

interface TaskWithPRs {
  issue: JiraIssue;
  linkedIssues: Array<{ key: string; summary: string; status: string }>;
  pullRequests: {
    open: PullRequest[];
    merged: PullRequest[];
  };
}

interface ActionSummaryProps {
  tasks: TaskWithPRs[];
  jiraBaseUrl: string;
  branchesByTask: Map<string, Branch[]>;
  onCheckRerun?: (owner: string, repo: string, prNumber: number) => void;
  loadingPRs?: boolean;
}

interface ActionItem {
  type: 'conflict' | 'changes_requested' | 'checks_failed' | 'ready_for_testing' | 'create_pr';
  priority: number;
  taskKey: string;
  taskSummary: string;
  prNumber?: number;
  prTitle?: string;
  prUrl?: string;
  repository?: string;
  repoFullName?: string;
  failedChecks?: number;
  checks?: Check[];
  branches?: Branch[];
}

export const ActionSummary: React.FC<ActionSummaryProps> = ({ tasks, jiraBaseUrl, branchesByTask, onCheckRerun, loadingPRs = false }) => {
  const [rerunningChecks, setRerunningChecks] = useState<Set<number>>(new Set());
  const [rerunTriggeredChecks, setRerunTriggeredChecks] = useState<Set<number>>(new Set());
  const { showSuccess, showError } = useToastContext();
  const prevTasksRef = useRef(tasks);
  const actionItems: ActionItem[] = [];

  // Clear rerunTriggeredChecks when tasks data is refreshed from API
  useEffect(() => {
    if (tasks !== prevTasksRef.current) {
      setRerunTriggeredChecks(new Set());
      prevTasksRef.current = tasks;
    }
  }, [tasks]);

  tasks.forEach((task) => {
    // Check for conflicts
    task.pullRequests.open.forEach((pr) => {
      if (pr.mergeable === false) {
        actionItems.push({
          type: 'conflict',
          priority: 1,
          taskKey: task.issue.key,
          taskSummary: task.issue.fields.summary,
          prNumber: pr.number,
          prTitle: pr.title,
          prUrl: pr.url,
          repository: pr.repository.name
        });
      }
    });

    // Check for changes requested
    task.pullRequests.open.forEach((pr) => {
      const hasChangesRequested = pr.changesRequested &&
        pr.lastCommitDate &&
        pr.lastReviewDate &&
        new Date(pr.lastReviewDate) > new Date(pr.lastCommitDate);

      if (hasChangesRequested && pr.mergeable !== false) {
        actionItems.push({
          type: 'changes_requested',
          priority: 2,
          taskKey: task.issue.key,
          taskSummary: task.issue.fields.summary,
          prNumber: pr.number,
          prTitle: pr.title,
          prUrl: pr.url,
          repository: pr.repository.name
        });
      }
    });

    // Check for failed checks
    task.pullRequests.open.forEach((pr) => {
      if (pr.checkStatus?.state === 'failure' && pr.mergeable !== false) {
        // Filter out checks that have been rerun (they're now pending)
        const failedChecks = pr.checkStatus.checks?.filter(c =>
          ['failure', 'timed_out', 'action_required'].includes(c.conclusion || '') &&
          !rerunTriggeredChecks.has(c.id)
        ) || [];

        // Only add action item if there are still failed checks after filtering
        if (failedChecks.length > 0) {
          actionItems.push({
            type: 'checks_failed',
            priority: 3,
            taskKey: task.issue.key,
            taskSummary: task.issue.fields.summary,
            prNumber: pr.number,
            prTitle: pr.title,
            prUrl: pr.url,
            repository: pr.repository.name,
            repoFullName: pr.repository.fullName,
            failedChecks: failedChecks.length,
            checks: failedChecks
          });
        }
      }
    });

    // Check for ready for testing (all PRs merged, test subtasks pending)
    const allPRsMerged = task.pullRequests.open.length === 0 && task.pullRequests.merged.length > 0;
    if (allPRsMerged && task.issue.fields.subtasks) {
      const hasTestSubtaskPending = task.issue.fields.subtasks.some(subtask => {
        const summaryLower = subtask.fields.summary.toLowerCase();
        const statusLower = subtask.fields.status.name.toLowerCase();
        return summaryLower.includes('test') &&
               (statusLower === 'to do' || statusLower === 'todo' || statusLower.includes('backlog'));
      });

      if (hasTestSubtaskPending) {
        actionItems.push({
          type: 'ready_for_testing',
          priority: 4,
          taskKey: task.issue.key,
          taskSummary: task.issue.fields.summary
        });
      }
    }

    // Check for branches without PRs (lower priority)
    const noPRs = task.pullRequests.open.length === 0 && task.pullRequests.merged.length === 0;
    const branches = branchesByTask.get(task.issue.key);
    if (noPRs && branches && branches.length > 0) {
      actionItems.push({
        type: 'create_pr',
        priority: 5,
        taskKey: task.issue.key,
        taskSummary: task.issue.fields.summary,
        branches
      });
    }
  });

  // Sort by priority
  actionItems.sort((a, b) => a.priority - b.priority);

  const getActionIcon = (type: ActionItem['type']) => {
    switch (type) {
      case 'conflict':
        return { icon: 'warning', color: 'text-red-600' };
      case 'changes_requested':
        return { icon: 'rate_review', color: 'text-orange-600' };
      case 'checks_failed':
        return { icon: 'cancel', color: 'text-red-600' };
      case 'ready_for_testing':
        return { icon: 'science', color: 'text-blue-600' };
      case 'create_pr':
        return { icon: 'account_tree', color: 'text-green-600' };
    }
  };

  const getActionLabel = (item: ActionItem) => {
    switch (item.type) {
      case 'conflict':
        return 'Merge Conflict';
      case 'changes_requested':
        return 'Changes Requested';
      case 'checks_failed':
        return `${item.failedChecks} Check${item.failedChecks !== 1 ? 's' : ''} Failed`;
      case 'ready_for_testing':
        return 'Ready for Testing';
      case 'create_pr':
        return `${item.branches?.length || 0} Branch${item.branches?.length !== 1 ? 'es' : ''} Ready`;
    }
  };

  const handleRerunCheck = async (e: React.MouseEvent, checkId: number, repoFullName: string, checkName: string, prNumber?: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!checkId) {
      showError('Cannot rerun this check - no valid check ID');
      return;
    }

    setRerunningChecks(prev => new Set(prev).add(checkId));
    try {
      const [owner, repo] = repoFullName.split('/');

      const response = await fetch(`/api${API_ROUTES.GITHUB.RERUN_CHECK(owner, repo, checkId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to rerun check');
      }

      showSuccess(`Rerun triggered for "${checkName}"`);

      // Track this check as rerun so we can hide it from failed checks immediately
      setRerunTriggeredChecks(prev => new Set(prev).add(checkId));

      // Notify parent to refetch just this PR's data (much more efficient than refetching everything)
      if (onCheckRerun && prNumber) {
        onCheckRerun(owner, repo, prNumber);
      }
    } catch (error) {
      console.error('Failed to rerun check:', error);
      showError(`Failed to rerun check: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRerunningChecks(prev => {
        const newSet = new Set(prev);
        newSet.delete(checkId);
        return newSet;
      });
    }
  };

  // Don't show anything if not loading and no action items
  if (!loadingPRs && actionItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-gray-700">notifications_active</span>
        <h3 className="font-semibold text-gray-900">
          Action Items {!loadingPRs && `(${actionItems.length})`}
        </h3>
      </div>

      {loadingPRs ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-start gap-3 p-2">
              <Skeleton variant="circular" width="20px" height="20px" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton variant="text" width="80px" height="16px" />
                  <Skeleton variant="rectangular" width="100px" height="20px" />
                  <Skeleton variant="text" width="40px" height="16px" />
                </div>
                <Skeleton variant="text" width="70%" height="14px" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
        {actionItems.map((item, index) => {
          const actionInfo = getActionIcon(item.type);
          return (
            <div
              key={`${item.taskKey}-${item.prNumber || 'test'}-${index}`}
              className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded transition-colors"
            >
              <span className={`material-symbols-outlined ${actionInfo.color} text-lg mt-0.5`}>
                {actionInfo.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={`${jiraBaseUrl}/browse/${item.taskKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {item.taskKey}
                  </a>
                  <Badge
                    variant={
                      item.type === 'conflict' || item.type === 'checks_failed'
                        ? 'danger'
                        : item.type === 'changes_requested'
                        ? 'warning'
                        : 'info'
                    }
                  >
                    {getActionLabel(item)}
                  </Badge>
                  {item.prNumber && item.prUrl && (
                    <a
                      href={item.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-600 hover:text-blue-600"
                    >
                      #{item.prNumber}
                    </a>
                  )}
                  {item.repository && (
                    <span className="text-xs text-gray-500">• {item.repository}</span>
                  )}
                </div>
                {item.prTitle && (
                  <p className="text-sm text-gray-700 mt-0.5 truncate">{item.prTitle}</p>
                )}
                {!item.prTitle && item.type !== 'create_pr' && (
                  <p className="text-sm text-gray-700 mt-0.5 truncate">{item.taskSummary}</p>
                )}

                {/* Show branch cards for create_pr action items */}
                {item.type === 'create_pr' && item.branches && (
                  <div className="mt-2 space-y-2">
                    {item.branches.map((branch, idx) => (
                      <BranchCard
                        key={idx}
                        branch={branch}
                        taskKey={item.taskKey}
                        jiraBaseUrl={jiraBaseUrl}
                        relatedPRs={[]}
                        getTimeAgo={getTimeAgo}
                      />
                    ))}
                  </div>
                )}

                {/* Show failed checks inline for checks_failed action items */}
                {item.type === 'checks_failed' && item.checks && item.checks.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {item.checks.map((check, idx) => (
                      <FailedCheckItem
                        key={idx}
                        check={check}
                        repoFullName={item.repoFullName!}
                        onRerun={async (checkId, checkName) => {
                          await handleRerunCheck({ preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent, checkId, item.repoFullName!, checkName, item.prNumber);
                        }}
                        isRerunning={rerunningChecks.has(check.id)}
                        allFailedChecks={item.checks}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};
