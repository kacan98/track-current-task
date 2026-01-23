import React from 'react';
import { Button } from '@/components/ui/Button';

interface AuthPromptProps {
  isJiraAuthenticated: boolean;
  isGitHubAuthenticated: boolean;
  onJiraAuth: () => void;
  onGitHubAuth: () => void;
}

export const AuthPrompt: React.FC<AuthPromptProps> = ({
  isJiraAuthenticated,
  isGitHubAuthenticated,
  onJiraAuth,
  onGitHubAuth
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="material-symbols-outlined text-blue-600 text-3xl">lock</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
      <p className="text-gray-600 mb-6">
        You need to authenticate with both Jira and GitHub to view your tasks.
      </p>
      <div className="flex items-center justify-center gap-4">
        {!isJiraAuthenticated && (
          <Button onClick={onJiraAuth}>
            Authenticate with Jira
          </Button>
        )}
        {!isGitHubAuthenticated && (
          <Button onClick={onGitHubAuth} variant="secondary">
            Authenticate with GitHub
          </Button>
        )}
      </div>
    </div>
  );
};
