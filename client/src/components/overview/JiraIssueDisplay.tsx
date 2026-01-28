import React from 'react';

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
    };
    subtasks?: Subtask[];
  };
}

interface JiraIssueDisplayProps {
  issue: JiraIssue;
  jiraBaseUrl: string;
  getStatusBadgeColor: (statusName: string) => string;
}

export const JiraIssueDisplay: React.FC<JiraIssueDisplayProps> = ({
  issue,
  jiraBaseUrl,
  getStatusBadgeColor
}) => {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <a
          href={`${jiraBaseUrl}/browse/${issue.key}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 font-mono text-sm font-semibold"
        >
          {issue.key}
        </a>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(
            issue.fields.status.name
          )}`}
        >
          {issue.fields.status.name}
        </span>
      </div>
      <div className="text-sm text-gray-700">
        {issue.fields.summary}
      </div>

      {/* Subtasks */}
      {issue.fields.subtasks && issue.fields.subtasks.length > 0 && (
        <div className="mt-2 ml-4 space-y-1">
          {issue.fields.subtasks.map((subtask) => (
            <div key={subtask.key} className="flex items-center gap-2 text-xs">
              <span className="text-gray-400">└─</span>
              <a
                href={`${jiraBaseUrl}/browse/${subtask.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-mono font-semibold"
              >
                {subtask.key}
              </a>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${getStatusBadgeColor(subtask.fields.status.name)}`}>
                {subtask.fields.status.name}
              </span>
              <span className="text-gray-600 truncate flex-1">{subtask.fields.summary}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
