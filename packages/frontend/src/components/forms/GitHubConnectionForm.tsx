import { useState } from 'react';
import { Button } from '../ui/Button';
import { useGitHubAuth } from '../../contexts/GitHubAuthContext';

export function GitHubConnectionForm() {
  const { isAuthenticated, user, logout, isLoading } = useGitHubAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    // The GitHub auth URL will be handled by the existing flow in CommitsModal
    // We'll redirect to the OAuth URL directly
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!clientId) {
      alert('GitHub client ID not configured');
      setIsConnecting(false);
      return;
    }

    const state = crypto.randomUUID();
    sessionStorage.setItem('github_oauth_state', state);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${window.location.origin}/github/callback`,
      scope: 'repo',
      state: state
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    window.location.href = authUrl; // Direct redirect instead of popup
  };

  const handleDisconnect = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to disconnect from GitHub:', error);
    }
  };

  const handleManagePermissions = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!clientId) {
      alert('GitHub client ID not configured');
      return;
    }

    // Open GitHub's OAuth app management page in a new window
    const manageUrl = `https://github.com/settings/connections/applications/${clientId}`;
    window.open(manageUrl, 'github-manage-permissions', 'width=800,height=600,scrollbars=yes,resizable=yes');
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
          </svg>
          GitHub Integration
        </h3>
        <div className="flex items-center gap-2 text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
          Checking connection status...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
        </svg>
        GitHub Integration
      </h3>

      {isAuthenticated && user ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                Connected to GitHub
              </p>
              <p className="text-sm text-green-600">
                Signed in as <strong>{user.login}</strong>
              </p>
            </div>
            {user.avatar_url && (
              <img 
                src={user.avatar_url} 
                alt={user.login}
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
              />
            )}
          </div>

          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">Permissions granted:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Read access to your repositories</li>
                <li>Access to commit history</li>
                <li>Repository metadata</li>
              </ul>
              <p className="text-xs text-gray-500 mt-2">
                You can revoke access or modify permissions on GitHub's settings page.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleManagePermissions}
                variant="secondary"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Manage Permissions
              </Button>
              <Button
                onClick={handleDisconnect}
                variant="secondary"
                className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">
              Connect your GitHub account to automatically load your commits in the daily logs.
            </p>
            <ul className="text-xs text-gray-500 list-disc list-inside space-y-1">
              <li>View commits for any date</li>
              <li>Click commits to open them on GitHub</li>
              <li>Works with private repositories</li>
            </ul>
          </div>

          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            variant="primary"
            className="w-full bg-gray-900 hover:bg-gray-800 flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                </svg>
                Connect with GitHub
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}