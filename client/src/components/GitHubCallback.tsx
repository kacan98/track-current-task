import { useEffect } from 'react';
import { useGitHubAuth } from '@/contexts/GitHubAuthContext';

export function GitHubCallback() {
  const { login } = useGitHubAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      if (error) {
        console.error('GitHub OAuth error:', error);
        alert('GitHub authentication failed: ' + error);
        window.close();
        return;
      }

      // For popup windows, validate state via parent window communication
      if (window.opener) {
        console.log('Popup: Sending message to parent', { code, state, error });
        // Send the callback data to parent window for validation
        window.opener.postMessage({
          type: 'GITHUB_OAUTH_CALLBACK',
          code,
          state,
          error
        }, window.location.origin);
        window.close();
        return;
      }

      // For same-window flow, validate state parameter
      const expectedState = sessionStorage.getItem('github_oauth_state');
      if (!state || state !== expectedState) {
        console.error('Invalid state parameter. Expected:', expectedState, 'Got:', state);
        alert('Authentication failed: Invalid state parameter');
        return;
      }

      // Clear the state from storage
      sessionStorage.removeItem('github_oauth_state');

      if (code) {
        try {
          await login(code);
          // Close the popup window
          if (window.opener) {
            window.close();
          } else {
            // If opened in same window, redirect to home
            window.location.href = '/';
          }
        } catch (error) {
          console.error('Failed to complete GitHub login:', error);
          alert('Failed to complete GitHub authentication');
          window.close();
        }
      }
    };

    // Only run on GitHub callback page
    if (window.location.pathname === '/github/callback') {
      handleCallback();
    }
  }, [login]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md w-full text-center">
        <h3 className="font-semibold text-gray-900 mb-2">Completing GitHub Authentication</h3>
        <p className="text-gray-600 text-sm">Please wait...</p>
      </div>
    </div>
  );
}