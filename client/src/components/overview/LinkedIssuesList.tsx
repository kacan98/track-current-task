import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface LinkedIssue {
  key: string;
  summary: string;
  status: string;
}

interface LinkedIssuesListProps {
  linkedIssues: LinkedIssue[];
  jiraBaseUrl: string;
  getStatusBadgeColor: (statusName: string) => string;
}

export const LinkedIssuesList: React.FC<LinkedIssuesListProps> = ({
  linkedIssues,
  jiraBaseUrl,
  getStatusBadgeColor
}) => {
  const [showAllLinkedTasks, setShowAllLinkedTasks] = useState(false);

  if (linkedIssues.length === 0) return null;

  const inProgressLinked = linkedIssues.filter(linked =>
    linked.status.toLowerCase().includes('progress') ||
    linked.status.toLowerCase().includes('in progress')
  );
  const otherLinked = linkedIssues.filter(linked =>
    !linked.status.toLowerCase().includes('progress') &&
    !linked.status.toLowerCase().includes('in progress')
  );

  return (
    <>
      {inProgressLinked.map((linked) => (
        <div key={linked.key} className="border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <a
              href={`${jiraBaseUrl}/browse/${linked.key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-mono text-sm font-semibold"
            >
              {linked.key}
            </a>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(linked.status)}`}>
              {linked.status}
            </span>
          </div>
          <div className="text-sm text-gray-700">
            {linked.summary}
          </div>
        </div>
      ))}

      {/* Collapsible other tasks */}
      {otherLinked.length > 0 && (
        <>
          <div className="border-t border-gray-200 pt-3">
            <Button
              onClick={() => setShowAllLinkedTasks(!showAllLinkedTasks)}
              size="sm"
              variant="secondary"
              className="w-full text-left text-xs text-gray-600 hover:text-gray-800 flex items-center justify-between !bg-gray-100 hover:!bg-gray-200"
            >
              <span>
                {showAllLinkedTasks ? '▼' : '▶'} Other Linked Tasks ({otherLinked.length})
              </span>
            </Button>
          </div>

          {showAllLinkedTasks && otherLinked.map((linked) => (
            <div key={linked.key} className="border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <a
                  href={`${jiraBaseUrl}/browse/${linked.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-mono text-sm font-semibold"
                >
                  {linked.key}
                </a>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(linked.status)}`}>
                  {linked.status}
                </span>
              </div>
              <div className="text-sm text-gray-700">
                {linked.summary}
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
};
