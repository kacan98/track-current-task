import { useState, useEffect, useRef } from 'react';
import { loginToJira, getAuthStatus, logoutFromJira } from '../../services/JiraIntegration';
import { Button } from '../ui/Button';
import jiraIcon from '../../assets/icons/jira.svg';

interface JiraCredentialsFormProps {
  onAuthSuccess?: () => void;
}

export function JiraCredentialsForm({ onAuthSuccess }: JiraCredentialsFormProps = {}) {
  const loginRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [authStatus, setAuthStatus] = useState<{ authenticated: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const status = await getAuthStatus();
      setAuthStatus(status);
    } catch {
      setAuthStatus({ authenticated: false });
    } finally {
      setLoading(false);
    }
  };


  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const login = loginRef.current?.value;
    const password = passwordRef.current?.value;
    
    if (!login || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    setSuccess(null);
    try {
      await loginToJira(login, password);
      setAuthStatus({ authenticated: true });
      setSuccess('Successfully authenticated!');
      setTimeout(() => {
        onAuthSuccess?.();
      }, 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to authenticate');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutFromJira();
      setAuthStatus({ authenticated: false });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <img src={jiraIcon} alt="Jira" className="w-5 h-5" />
          Jira Integration
        </h3>
        <div className="flex items-center gap-2 text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
          Checking connection status...
        </div>
      </div>
    );
  }

  if (authStatus?.authenticated) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <img src={jiraIcon} alt="Jira" className="w-5 h-5" />
          Jira Integration
        </h3>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">
                Connected to Jira
              </p>
              <p className="text-sm text-blue-600">
                Authentication active and ready for time tracking
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">Jira integration enabled:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Automatic time logging to Jira tasks</li>
                <li>Task creation and updates</li>
                <li>Worklog management</li>
              </ul>
            </div>

            <Button
              onClick={handleLogout}
              variant="secondary"
              className="w-full border-red-200 text-red-700 hover:bg-red-50"
              disabled={loading}
            >
              {loading ? 'Disconnecting...' : 'Disconnect from Jira'}
            </Button>
          </div>

          {success && (
            <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <img src={jiraIcon} alt="Jira" className="w-5 h-5" />
        Jira Integration
      </h3>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            Connect to Jira to automatically log your work time and manage tasks.
          </p>
          <ul className="text-xs text-gray-500 list-disc list-inside space-y-1">
            <li>Log time directly to Jira tasks</li>
            <li>Create and update work items</li>
            <li>Track daily productivity</li>
          </ul>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="jira-login" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="jira-login"
              ref={loginRef}
              type="email"
              autoComplete="username"
              placeholder="Enter your Jira email"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="jira-password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="flex gap-2">
              <input
                id="jira-password"
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your Jira password"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Button
                type="button"
                variant="secondary"
                className="px-3 text-sm"
                onClick={() => setShowPassword(v => !v)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isConnecting}
            variant="primary"
            className="w-full flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Connecting...
              </>
            ) : (
              <>
                <img src={jiraIcon} alt="Jira" className="w-4 h-4" />
                Connect to Jira
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        )}
      </form>
    </div>
  );
}
