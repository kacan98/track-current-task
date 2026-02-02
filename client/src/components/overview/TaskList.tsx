import React from 'react';
import { TaskCard } from './TaskCard';
import { Button } from '@/components/ui/Button';
import type { JiraIssue } from '@shared/jira.model';
import type { PullRequest, Branch } from '@shared/github.model';

interface TaskWithPRs {
  issue: JiraIssue;
  linkedIssues: Array<{ key: string; summary: string; status: string }>;
  pullRequests: {
    open: PullRequest[];
    merged: PullRequest[];
  };
}

interface TaskListProps {
  tasks: TaskWithPRs[];
  jiraBaseUrl: string;
  expandedMergedPRs: Set<string>;
  onToggleMergedPRs: (taskKey: string) => void;
  onBranchesFound?: (taskKey: string, branches: Branch[]) => void;
  onCheckRerun?: () => void;
  loadingPRs?: boolean;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  jiraBaseUrl,
  expandedMergedPRs,
  onToggleMergedPRs,
  onBranchesFound,
  onCheckRerun,
  loadingPRs
}) => {
  // A task group is "in progress" if the main task OR any linked task is "In Progress"
  const inProgressTasks = tasks.filter((task) => {
    const mainTaskInProgress = task.issue.fields.status.statusCategory.name.toLowerCase() === 'in progress';
    const linkedTaskInProgress = task.linkedIssues.some(linked =>
      linked.status.toLowerCase().includes('progress') || linked.status.toLowerCase().includes('in progress')
    );
    return mainTaskInProgress || linkedTaskInProgress;
  });

  const otherTasks = tasks.filter((task) => {
    const mainTaskInProgress = task.issue.fields.status.statusCategory.name.toLowerCase() === 'in progress';
    const linkedTaskInProgress = task.linkedIssues.some(linked =>
      linked.status.toLowerCase().includes('progress') || linked.status.toLowerCase().includes('in progress')
    );
    return !mainTaskInProgress && !linkedTaskInProgress;
  });

  const [showOtherTasks, setShowOtherTasks] = React.useState(false);

  return (
    <>
      {/* In Progress Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {inProgressTasks.map((task) => (
          <TaskCard
            key={task.issue.key}
            issue={task.issue}
            linkedIssues={task.linkedIssues}
            pullRequests={task.pullRequests}
            jiraBaseUrl={jiraBaseUrl}
            expandedMergedPRs={expandedMergedPRs}
            onToggleMergedPRs={onToggleMergedPRs}
            onBranchesFound={onBranchesFound}
            onCheckRerun={onCheckRerun}
            loadingPRs={loadingPRs}
          />
        ))}
      </div>

      {/* Other Tasks - Collapsible */}
      {otherTasks.length > 0 && (
        <div className="mt-6">
          <Button
            onClick={() => setShowOtherTasks(!showOtherTasks)}
            size="md"
            variant="secondary"
            className="w-full text-left text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center justify-between !bg-gray-100 hover:!bg-gray-200 !rounded-lg"
          >
            <span>
              {showOtherTasks ? '▼' : '▶'} Other Tasks ({otherTasks.length})
            </span>
          </Button>

          {showOtherTasks && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
              {otherTasks.map((task) => (
                <TaskCard
                  key={task.issue.key}
                  issue={task.issue}
                  linkedIssues={task.linkedIssues}
                  pullRequests={task.pullRequests}
                  jiraBaseUrl={jiraBaseUrl}
                  expandedMergedPRs={expandedMergedPRs}
                  onToggleMergedPRs={onToggleMergedPRs}
                  onBranchesFound={onBranchesFound}
                  onCheckRerun={onCheckRerun}
                  loadingPRs={loadingPRs}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
