import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FailedCheckItem } from './FailedCheckItem';
import { API_ROUTES } from '@shared/apiRoutes';
import { useToastContext } from '@/contexts/ToastContext';
import type { PullRequest } from '@shared/github.model';

interface PullRequestCardProps {
  pr: PullRequest;
  relatedPRs: PullRequest[];
  jiraBaseUrl: string;
  getPRStateBadgeColor: (pr: PullRequest) => string;
  getPRStateLabel: (pr: PullRequest) => string;
  getTimeAgo: (dateString: string) => string;
  shouldShowChangesRequested: (pr: PullRequest) => boolean;
  hasConflicts: (pr: PullRequest) => boolean;
  getCheckStatusIcon: (state: string) => { icon: string; color: string } | null;
  onCheckRerun?: ((owner: string, repo: string, prNumber: number) => void) | undefined;
}

export const PullRequestCard: React.FC<PullRequestCardProps> = ({
  pr,
  relatedPRs: _relatedPRs,
  jiraBaseUrl,
  getPRStateBadgeColor,
  getPRStateLabel,
  getTimeAgo,
  shouldShowChangesRequested,
  hasConflicts,
  getCheckStatusIcon,
  onCheckRerun
}) => {
  const [requestingReview, setRequestingReview] = useState(false);
  const [rerunningChecks, setRerunningChecks] = useState<Set<number>>(new Set());
  const [localCheckStatus, setLocalCheckStatus] = useState(pr.checkStatus);
  const { showSuccess, showError } = useToastContext();

  // Sync local state when pr.checkStatus changes from parent refetch
  useEffect(() => {
    setLocalCheckStatus(pr.checkStatus);
  }, [pr.checkStatus]);

  const totalComments = pr.comments + pr.reviewComments;
  const showChangesRequested = shouldShowChangesRequested(pr);
  const prHasConflicts = hasConflicts(pr);
  const checkStatus = localCheckStatus || pr.checkStatus;
  const checkStatusInfo = checkStatus ? getCheckStatusIcon(checkStatus.state) : null;
  const hasFailedChecks = checkStatus?.state === 'failure';
  const failedChecks = checkStatus?.checks?.filter(c =>
    ['failure', 'timed_out', 'action_required'].includes(c.conclusion || '')
  ) || [];

  const handleRequestReReview = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!pr.reviewStatus?.reviewers || pr.reviewStatus.reviewers.length === 0) {
      return;
    }

    setRequestingReview(true);
    try {
      const [owner, repo] = pr.repository.fullName.split('/');
      const reviewers = pr.reviewStatus.reviewers.map(r => r.login);

      const response = await fetch(`/api${API_ROUTES.GITHUB.REQUEST_REVIEW(owner, repo, pr.number)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ reviewers })
      });

      if (!response.ok) {
        throw new Error('Failed to request review');
      }

      console.log('Re-review requested successfully');
    } catch (error) {
      console.error('Failed to request re-review:', error);
    } finally {
      setRequestingReview(false);
    }
  };

  const handleRerunCheck = async (e: React.MouseEvent, checkId: number, checkName: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!checkId) {
      showError('Cannot rerun this check - no valid check ID');
      return;
    }

    setRerunningChecks(prev => new Set(prev).add(checkId));
    try {
      const [owner, repo] = pr.repository.fullName.split('/');

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

      // Update local state to show check as pending
      if (checkStatus) {
        setLocalCheckStatus({
          ...checkStatus,
          state: 'pending',
          checks: checkStatus.checks.map(c =>
            c.id === checkId
              ? { ...c, status: 'queued', conclusion: null }
              : c
          )
        });
      }

      // Notify parent to refetch just this PR's data (much more efficient than refetching everything)
      if (onCheckRerun) {
        onCheckRerun(owner, repo, pr.number);
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

  const getReviewStateColor = (state: string) => {
    switch (state) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'changes_requested':
        return 'bg-orange-100 text-orange-800';
      case 'partial_approval':
        return 'bg-blue-100 text-blue-800';
      case 'commented':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getReviewStateLabel = (state: string) => {
    switch (state) {
      case 'approved':
        return 'Approved';
      case 'changes_requested':
        return 'Changes Requested';
      case 'partial_approval':
        return 'Partially Approved';
      case 'commented':
        return 'Commented';
      default:
        return 'No Reviews';
    }
  };

  return (
    <div
      className={`p-3 rounded border transition-colors ${
        prHasConflicts
          ? 'bg-red-50 border-red-300'
          : hasFailedChecks
          ? 'bg-red-50 border-red-300'
          : showChangesRequested
          ? 'bg-orange-50 border-orange-300'
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      <a
        href={pr.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:opacity-80 transition-opacity"
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

      {/* PR Description with Jira link */}
      {pr.taskId && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1 text-gray-600">
            <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '14px' }}>link</span>
            <a
              href={`${jiraBaseUrl}/browse/${pr.taskId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >
              {pr.taskId}
            </a>
          </div>
        </div>
      )}

      {/* Check Status - consolidated in one place */}
      {checkStatus && (checkStatusInfo || checkStatus.total === 0) && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className={`text-xs flex items-center gap-1 mb-2 ${checkStatusInfo?.color || 'text-gray-500'}`}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
              {checkStatusInfo?.icon || 'help_outline'}
            </span>
            {checkStatus.state === 'success' && `${checkStatus.passed}/${checkStatus.total} checks passed`}
            {checkStatus.state === 'failure' && `${checkStatus.failed}/${checkStatus.total} checks failed`}
            {checkStatus.state === 'pending' && `${checkStatus.pending}/${checkStatus.total} checks pending`}
            {(checkStatus.state === 'unknown' || checkStatus.total === 0) && 'No checks configured'}
          </div>

          {/* Show failed checks inline */}
          {failedChecks.length > 0 && (
            <div className="space-y-1">
              {failedChecks.map((check, idx) => (
                <FailedCheckItem
                  key={idx}
                  check={check}
                  repoFullName={pr.repository.fullName}
                  onRerun={async (checkId, checkName) => {
                    await handleRerunCheck({ preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent, checkId, checkName);
                  }}
                  isRerunning={rerunningChecks.has(check.id)}
                  allFailedChecks={failedChecks}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Status */}
      {pr.reviewStatus && pr.reviewStatus.reviewers.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getReviewStateColor(pr.reviewStatus.state)}`}>
              {getReviewStateLabel(pr.reviewStatus.state)}
            </span>
            {pr.reviewStatus.state !== 'no_reviews' && (
              <Button
                onClick={handleRequestReReview}
                disabled={requestingReview}
                size="sm"
                variant="secondary"
                className="text-xs font-medium flex items-center gap-1"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>refresh</span>
                {requestingReview ? 'Requesting...' : 'Request Re-review'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[...pr.reviewStatus.reviewers].sort((a, b) => a.login.localeCompare(b.login)).map((reviewer, idx) => {
              const stateIcon = reviewer.state === 'APPROVED' ? '✓' : reviewer.state === 'CHANGES_REQUESTED' ? '✗' : '💬';
              const stateColor = reviewer.state === 'APPROVED' ? 'text-green-600' : reviewer.state === 'CHANGES_REQUESTED' ? 'text-orange-600' : 'text-gray-600';

              return (
                <div key={idx} className="flex items-center gap-1 text-xs">
                  <img src={reviewer.avatarUrl} alt={reviewer.login} className="w-5 h-5 rounded-full" />
                  <span className="text-gray-700">{reviewer.login}</span>
                  <span className={stateColor}>{stateIcon}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
