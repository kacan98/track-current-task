import React from 'react';
import type { Branch, PullRequest } from '@shared/github.model';

interface BranchCardProps {
  branch: Branch;
  taskKey: string;
  jiraBaseUrl: string;
  relatedPRs?: PullRequest[];
  getTimeAgo?: (date: string) => string;
}

export const BranchCard: React.FC<BranchCardProps> = ({
  branch,
  taskKey,
  jiraBaseUrl,
  relatedPRs = [],
  getTimeAgo
}) => {
  // Build PR description with Jira link and related PRs
  let prDescription = `[${taskKey}](${jiraBaseUrl}/browse/${taskKey})`;

  if (relatedPRs.length > 0) {
    prDescription += `\n\nRelated PRs:\n`;
    relatedPRs.forEach(pr => {
      prDescription += `- [${pr.repository.name}#${pr.number}](${pr.url}) - ${pr.title}\n`;
    });
  }

  const createPrUrlWithDescription = `${branch.createPrUrl}&body=${encodeURIComponent(prDescription)}`;

  return (
    <a
      href={createPrUrlWithDescription}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-2 p-2 bg-white border border-gray-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-colors text-xs"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="material-symbols-outlined text-gray-500" style={{ fontSize: '16px' }}>
          account_tree
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900 truncate">{branch.name}</div>
          <div className="text-gray-500 flex items-center gap-2">
            <span className="truncate">{branch.repository.name}</span>
            {branch.lastCommitDate && getTimeAgo && (
              <>
                <span>•</span>
                <span className="whitespace-nowrap">{getTimeAgo(branch.lastCommitDate)}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <span className="flex items-center gap-1 text-blue-600 font-medium whitespace-nowrap">
        Create PR
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
      </span>
    </a>
  );
};
