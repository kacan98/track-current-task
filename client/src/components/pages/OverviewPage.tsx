import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToastContext } from '@/contexts/ToastContext';
import { JiraAuthModal } from '@/components/modals/JiraAuthModal';
import { GitHubAuthModal } from '@/components/modals/GitHubAuthModal';
import { useAuthentication } from '@/hooks/useAuthentication';
import { useSettings } from '@/contexts/SettingsContext';
import { PageHeader } from '@/components/ui/layout/PageHeader';
import { ErrorDisplay } from '@/components/ui/feedback/ErrorDisplay';
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner';
import { EmptyState } from '@/components/ui/layout/EmptyState';
import { AuthPrompt } from '@/components/overview/AuthPrompt';
import { TaskList } from '@/components/overview/TaskList';
import { ActionSummary } from '@/components/overview/ActionSummary';

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

interface TaskWithPRs {
  issue: JiraIssue;
  linkedIssues: Array<{ key: string; summary: string; status: string }>;
  pullRequests: {
    open: PullRequest[];
    merged: PullRequest[];
  };
}

export const OverviewPage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskWithPRs[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showJiraAuth, setShowJiraAuth] = useState(false);
  const [showGitHubAuth, setShowGitHubAuth] = useState(false);
  const [expandedMergedPRs, setExpandedMergedPRs] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { showError, showSuccess } = useToastContext();
  const { isAuthenticated: isJiraAuthenticated, isCheckingAuth, handleAuthSuccess } = useAuthentication();
  const [isGitHubAuthenticated, setIsGitHubAuthenticated] = useState(false);
  const [isCheckingGitHubAuth, setIsCheckingGitHubAuth] = useState(true);
  const settings = useSettings();
  const [showSettingsError, setShowSettingsError] = useState(false);

  // Normalize Jira URL to remove trailing slashes
  const rawJiraBaseUrl = settings?.getSetting('jiraBaseUrl') || '';
  const jiraBaseUrl = rawJiraBaseUrl.replace(/\/+$/, '');

  // Check if Jira URL is configured
  useEffect(() => {
    if (!rawJiraBaseUrl || rawJiraBaseUrl === 'https://your-jira-instance.atlassian.net') {
      setShowSettingsError(true);
    } else {
      setShowSettingsError(false);
    }
  }, [rawJiraBaseUrl]);

  const toggleMergedPRs = (taskKey: string) => {
    setExpandedMergedPRs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskKey)) {
        newSet.delete(taskKey);
      } else {
        newSet.add(taskKey);
      }
      return newSet;
    });
  };

  // Check GitHub authentication status
  useEffect(() => {
    const checkGitHubAuth = async () => {
      try {
        const response = await fetch('/api/github/auth/status', {
          credentials: 'include'
        });
        const data = await response.json();
        setIsGitHubAuthenticated(data.authenticated);
      } catch (error) {
        console.error('Failed to check GitHub auth:', error);
        setIsGitHubAuthenticated(false);
      } finally {
        setIsCheckingGitHubAuth(false);
      }
    };
    checkGitHubAuth();
  }, []);

  const fetchOverview = async () => {
    // Check if Jira URL is configured
    if (!jiraBaseUrl || jiraBaseUrl === '') {
      setShowSettingsError(true);
      return;
    }

    // Check authentication first
    if (!isJiraAuthenticated) {
      setShowJiraAuth(true);
      return;
    }

    if (!isGitHubAuthenticated) {
      setShowGitHubAuth(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Fetch Jira tasks
      const jiraResponse = await fetch('/api/jira/tasks/assigned', {
        credentials: 'include'
      });

      if (!jiraResponse.ok) {
        if (jiraResponse.status === 401) {
          setShowJiraAuth(true);
          throw new Error('Please authenticate with Jira first');
        }
        let errorMessage = `Failed to fetch Jira tasks (${jiraResponse.status})`;
        try {
          const errorData = await jiraResponse.json();
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch {
          // If response isn't JSON, use status text
          errorMessage = `Failed to fetch Jira tasks: ${jiraResponse.statusText}`;
        }
        console.error('Jira API error:', errorMessage);
        throw new Error(errorMessage);
      }

      const jiraData = await jiraResponse.json();
      const issues: JiraIssue[] = jiraData.issues;

      if (issues.length === 0) {
        setTasks([]);
        showSuccess('No active tasks found');
        return;
      }

      // Extract task IDs and linked issue IDs
      const taskIds = issues.map((issue: JiraIssue) => issue.key);

      // Collect all linked issue keys
      const allLinkedIssueKeys = new Set<string>();
      issues.forEach((issue: JiraIssue) => {
        issue.fields.issuelinks?.forEach((link: JiraIssueLink) => {
          if (link.inwardIssue) {
            allLinkedIssueKeys.add(link.inwardIssue.key);
          }
          if (link.outwardIssue) {
            allLinkedIssueKeys.add(link.outwardIssue.key);
          }
        });
      });

      // Combine all task IDs (original + linked) for PR search
      const allTaskIds = [...taskIds, ...Array.from(allLinkedIssueKeys)];

      // Fetch PRs for these task IDs (including linked issues)
      const ghResponse = await fetch('/api/github/pulls/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ taskIds: allTaskIds })
      });

      if (!ghResponse.ok) {
        if (ghResponse.status === 401) {
          setShowGitHubAuth(true);
          throw new Error('Please authenticate with GitHub first');
        }
        throw new Error('Failed to fetch pull requests');
      }

      const ghData = await ghResponse.json();
      const pullRequests: PullRequest[] = ghData.pullRequests;

      // Group tasks by their linked issues (so linked tasks appear as one card)
      const processedIssueKeys = new Set<string>();
      const tasksWithPRs: TaskWithPRs[] = [];

      issues.forEach((issue: JiraIssue) => {
        // Skip if already processed as part of a linked group
        if (processedIssueKeys.has(issue.key)) return;

        // Mark this issue as processed
        processedIssueKeys.add(issue.key);

        // Extract linked issues that are also in our assigned list
        const linkedIssues: Array<{ key: string; summary: string; status: string }> = [];
        issue.fields.issuelinks?.forEach((link: JiraIssueLink) => {
          const linkedIssue = link.inwardIssue || link.outwardIssue;
          if (linkedIssue) {
            // Check if this linked issue is also in our assigned issues list
            const linkedInOurList = issues.find(i => i.key === linkedIssue.key);
            if (linkedInOurList) {
              // It's in our assigned list, so mark it as processed to avoid duplicate cards
              processedIssueKeys.add(linkedIssue.key);
            }

            linkedIssues.push({
              key: linkedIssue.key,
              summary: linkedIssue.fields.summary,
              status: linkedIssue.fields.status.name
            });
          }
        });

        // Get PRs for this task and its linked issues
        const linkedTaskIds = [issue.key, ...linkedIssues.map(li => li.key)];
        const taskPRs = pullRequests.filter((pr: PullRequest) =>
          linkedTaskIds.includes(pr.taskId)
        );

        // Sort open PRs: conflicts first, failed checks, then changes requested, then by comment count descending
        const openPRs = taskPRs
          .filter((pr: PullRequest) => !pr.merged && pr.state === 'open')
          .sort((a: PullRequest, b: PullRequest) => {
            // PRs with merge conflicts first
            const aHasConflicts = a.mergeable === false;
            const bHasConflicts = b.mergeable === false;
            if (aHasConflicts && !bHasConflicts) return -1;
            if (!aHasConflicts && bHasConflicts) return 1;

            // PRs with failed checks second
            const aHasFailedChecks = a.checkStatus?.state === 'failure';
            const bHasFailedChecks = b.checkStatus?.state === 'failure';
            if (aHasFailedChecks && !bHasFailedChecks) return -1;
            if (!aHasFailedChecks && bHasFailedChecks) return 1;

            // Changes requested PRs third
            if (a.changesRequested && !b.changesRequested) return -1;
            if (!a.changesRequested && b.changesRequested) return 1;

            // Then by total comments (descending)
            const aTotalComments = a.comments + a.reviewComments;
            const bTotalComments = b.comments + b.reviewComments;
            return bTotalComments - aTotalComments;
          });

        tasksWithPRs.push({
          issue,
          linkedIssues,
          pullRequests: {
            open: openPRs,
            merged: taskPRs.filter((pr: PullRequest) => pr.merged)
          }
        });
      });

      setTasks(tasksWithPRs);
      setLastUpdated(new Date());
      showSuccess(`Loaded ${issues.length} tasks`);
    } catch (error) {
      console.error('Failed to fetch overview:', error);
      const errorMessage = (error as Error).message || 'Failed to load overview';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isJiraAuthenticated && isGitHubAuthenticated && !isCheckingAuth && !isCheckingGitHubAuth && !showSettingsError) {
      fetchOverview();
    }
  }, [isJiraAuthenticated, isGitHubAuthenticated, isCheckingAuth, isCheckingGitHubAuth, showSettingsError]);

  // Re-render every minute to update the "last updated" text
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(tick => tick + 1);
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <PageHeader
          title="My Tasks"
          description={
            lastUpdated
              ? `Your active Jira tasks with associated PRs • Last updated ${formatLastUpdated(lastUpdated)}`
              : "Your active Jira tasks with associated PRs"
          }
          backUrl="/"
          actions={
            <Button
              onClick={fetchOverview}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
          }
        />

        {error && <ErrorDisplay title="Error Loading Tasks" error={error} onDismiss={() => setError(null)} />}

        {showSettingsError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-yellow-600 mt-0.5">warning</span>
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-900 mb-1">Jira Configuration Required</h4>
                <p className="text-sm text-yellow-700 mb-3">
                  Please configure your Jira Base URL in settings to use this feature.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => window.location.href = '/'}
                  className="flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">settings</span>
                  Go to Settings
                </Button>
              </div>
            </div>
          </div>
        )}

        {isCheckingAuth || isCheckingGitHubAuth ? (
          <LoadingSpinner message="Checking authentication..." />
        ) : !isJiraAuthenticated || !isGitHubAuthenticated ? (
          <AuthPrompt
            isJiraAuthenticated={isJiraAuthenticated}
            isGitHubAuthenticated={isGitHubAuthenticated}
            onJiraAuth={() => setShowJiraAuth(true)}
            onGitHubAuth={() => setShowGitHubAuth(true)}
          />
        ) : isLoading && tasks.length === 0 ? (
          <LoadingSpinner message="Loading tasks..." />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="No active tasks"
            description="You don't have any active Jira tasks assigned to you."
          />
        ) : (
          <>
            <ActionSummary tasks={tasks} jiraBaseUrl={jiraBaseUrl} />
            <TaskList
              tasks={tasks}
              jiraBaseUrl={jiraBaseUrl}
              expandedMergedPRs={expandedMergedPRs}
              onToggleMergedPRs={toggleMergedPRs}
            />
          </>
        )}
      </div>

      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />

      <JiraAuthModal
        isOpen={showJiraAuth}
        onClose={() => setShowJiraAuth(false)}
        onAuthSuccess={() => {
          handleAuthSuccess();
          setShowJiraAuth(false);
          fetchOverview();
        }}
      />

      <GitHubAuthModal
        isOpen={showGitHubAuth}
        onClose={() => setShowGitHubAuth(false)}
        onAuthSuccess={() => {
          setIsGitHubAuthenticated(true);
          setShowGitHubAuth(false);
          fetchOverview();
        }}
      />
    </div>
  );
};
