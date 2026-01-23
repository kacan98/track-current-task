import React from 'react';
import { TaskCard } from './TaskCard';

interface JiraIssueLink {
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
    issuelinks?: JiraIssueLink[];
    subtasks?: Subtask[];
  };
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
}

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
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  jiraBaseUrl,
  expandedMergedPRs,
  onToggleMergedPRs
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
          />
        ))}
      </div>

      {/* Other Tasks - Collapsible */}
      {otherTasks.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowOtherTasks(!showOtherTasks)}
            className="w-full text-left text-sm font-semibold text-gray-700 hover:text-gray-900 py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-between"
          >
            <span>
              {showOtherTasks ? '▼' : '▶'} Other Tasks ({otherTasks.length})
            </span>
          </button>

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
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
