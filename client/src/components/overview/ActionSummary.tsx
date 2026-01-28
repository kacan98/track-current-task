import React, { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BranchCard } from './BranchCard';
import { getTimeAgo } from '@/utils/timeUtils';
import { API_ROUTES } from '@shared/apiRoutes';
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
  onCheckRerun?: () => void;
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

export const ActionSummary: React.FC<ActionSummaryProps> = ({ tasks, jiraBaseUrl, branchesByTask, onCheckRerun }) => {
  const [rerunningChecks, setRerunningChecks] = useState<Set<number>>(new Set());
  const actionItems: ActionItem[] = [];

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
        const failedChecks = pr.checkStatus.checks?.filter(c =>
          ['failure', 'timed_out', 'action_required'].includes(c.conclusion || '')
        ) || [];

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
          failedChecks: pr.checkStatus.failed,
          checks: failedChecks
        });
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

  if (actionItems.length === 0) {
    return null;
  }

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

  const handleRerunCheck = async (e: React.MouseEvent, checkId: number, repoFullName: string) => {
    e.preventDefault();
    e.stopPropagation();

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
        throw new Error('Failed to rerun check');
      }

      console.log('Check rerun triggered successfully');

      // Notify parent to refetch data
      if (onCheckRerun) {
        onCheckRerun();
      }
    } catch (error) {
      console.error('Failed to rerun check:', error);
    } finally {
      setRerunningChecks(prev => {
        const newSet = new Set(prev);
        newSet.delete(checkId);
        return newSet;
      });
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-gray-700">notifications_active</span>
        <h3 className="font-semibold text-gray-900">Action Items ({actionItems.length})</h3>
      </div>

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
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 bg-white border border-red-200 rounded text-xs"
                      >
                        <a
                          href={check.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 flex-1 min-w-0 hover:text-red-700"
                        >
                          <span className="material-symbols-outlined text-red-600" style={{ fontSize: '16px' }}>
                            cancel
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{check.name}</div>
                            {check.failedStep && (
                              <div className="text-gray-600 truncate">Step: {check.failedStep}</div>
                            )}
                            {check.errorMessage && (
                              <div className="text-xs text-gray-500 mt-1 line-clamp-2 whitespace-pre-wrap">{check.errorMessage}</div>
                            )}
                          </div>
                        </a>
                        <Button
                          onClick={(e) => handleRerunCheck(e, check.id, item.repoFullName!)}
                          disabled={rerunningChecks.has(check.id)}
                          size="sm"
                          variant="secondary"
                          className="text-xs font-medium flex items-center gap-1 whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>replay</span>
                          {rerunningChecks.has(check.id) ? 'Rerunning...' : 'Rerun'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
