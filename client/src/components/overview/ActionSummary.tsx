import React from 'react';
import { Badge } from '@/components/ui/Badge';

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
    subtasks?: Array<{
      key: string;
      fields: {
        summary: string;
        status: {
          name: string;
        };
      };
    }>;
  };
}

interface PullRequest {
  taskId: string;
  number: number;
  title: string;
  repository: {
    name: string;
  };
  url: string;
  changesRequested: boolean;
  mergeable?: boolean | null;
  lastCommitDate?: string | null;
  lastReviewDate?: string | null;
  checkStatus?: {
    state: string;
    failed: number;
  };
}

interface TaskWithPRs {
  issue: JiraIssue;
  pullRequests: {
    open: PullRequest[];
    merged: PullRequest[];
  };
}

interface ActionSummaryProps {
  tasks: TaskWithPRs[];
  jiraBaseUrl: string;
}

interface ActionItem {
  type: 'conflict' | 'changes_requested' | 'checks_failed' | 'ready_for_testing';
  priority: number;
  taskKey: string;
  taskSummary: string;
  prNumber?: number;
  prTitle?: string;
  prUrl?: string;
  repository?: string;
  failedChecks?: number;
}

export const ActionSummary: React.FC<ActionSummaryProps> = ({ tasks, jiraBaseUrl }) => {
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
        actionItems.push({
          type: 'checks_failed',
          priority: 3,
          taskKey: task.issue.key,
          taskSummary: task.issue.fields.summary,
          prNumber: pr.number,
          prTitle: pr.title,
          prUrl: pr.url,
          repository: pr.repository.name,
          failedChecks: pr.checkStatus.failed
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
                {!item.prTitle && (
                  <p className="text-sm text-gray-700 mt-0.5 truncate">{item.taskSummary}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
