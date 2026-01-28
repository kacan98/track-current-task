import React from 'react';
import { Button } from '@/components/ui/Button';
import type { PullRequest } from '@shared/github.model';

interface MergedPRsListProps {
  mergedPRs: PullRequest[];
  isExpanded: boolean;
  onToggle: () => void;
  getPRStateBadgeColor: (pr: PullRequest) => string;
  getPRStateLabel: (pr: PullRequest) => string;
}

export const MergedPRsList: React.FC<MergedPRsListProps> = ({
  mergedPRs,
  isExpanded,
  onToggle,
  getPRStateBadgeColor,
  getPRStateLabel
}) => {
  if (mergedPRs.length === 0) return null;

  return (
    <div className="mt-3">
      <Button
        onClick={onToggle}
        size="sm"
        variant="secondary"
        className="w-full text-left text-xs text-gray-600 hover:text-gray-800 flex items-center justify-between !bg-gray-100 hover:!bg-gray-200"
      >
        <span>
          {isExpanded ? '▼' : '▶'} Merged PRs ({mergedPRs.length})
        </span>
      </Button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {mergedPRs.map((pr) => (
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
  );
};
