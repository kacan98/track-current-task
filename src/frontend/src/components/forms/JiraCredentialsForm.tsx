import { useState, useEffect, useRef } from 'react';
import { loginToJira, getAuthStatus, logoutFromJira } from '../../services/JiraIntegration';
import { Button } from '../ui/Button';

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


  const handleLogin = async () => {
    const login = loginRef.current?.value;
    const password = passwordRef.current?.value;
    
    if (!login || !password) {
      setError('Please enter both login and password');
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
          <svg className="w-5 h-5" viewBox="2.59 0 214.09101008 224" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="jira-a" gradientTransform="matrix(1 0 0 -1 0 264)" gradientUnits="userSpaceOnUse" x1="102.4" x2="56.15" y1="218.63" y2="172.39">
                <stop offset=".18" stopColor="#0052cc"/>
                <stop offset="1" stopColor="#2684ff"/>
              </linearGradient>
              <linearGradient id="jira-b" x1="114.65" x2="160.81" xlinkHref="#jira-a" y1="85.77" y2="131.92"/>
            </defs>
            <path d="m214.06 105.73-96.39-96.39-9.34-9.34-72.56 72.56-33.18 33.17a8.89 8.89 0 0 0 0 12.54l66.29 66.29 39.45 39.44 72.55-72.56 1.13-1.12 32.05-32a8.87 8.87 0 0 0 0-12.59zm-105.73 39.39-33.12-33.12 33.12-33.12 33.11 33.12z" fill="#2684ff"/>
            <path d="m108.33 78.88a55.75 55.75 0 0 1 -.24-78.61l-72.47 72.44 39.44 39.44z" fill="url(#jira-a)"/>
            <path d="m141.53 111.91-33.2 33.21a55.77 55.77 0 0 1 0 78.86l72.67-72.63z" fill="url(#jira-b)"/>
          </svg>
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
          <svg className="w-5 h-5" viewBox="2.59 0 214.09101008 224" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="jira-a" gradientTransform="matrix(1 0 0 -1 0 264)" gradientUnits="userSpaceOnUse" x1="102.4" x2="56.15" y1="218.63" y2="172.39">
                <stop offset=".18" stopColor="#0052cc"/>
                <stop offset="1" stopColor="#2684ff"/>
              </linearGradient>
              <linearGradient id="jira-b" x1="114.65" x2="160.81" xlinkHref="#jira-a" y1="85.77" y2="131.92"/>
            </defs>
            <path d="m214.06 105.73-96.39-96.39-9.34-9.34-72.56 72.56-33.18 33.17a8.89 8.89 0 0 0 0 12.54l66.29 66.29 39.45 39.44 72.55-72.56 1.13-1.12 32.05-32a8.87 8.87 0 0 0 0-12.59zm-105.73 39.39-33.12-33.12 33.12-33.12 33.11 33.12z" fill="#2684ff"/>
            <path d="m108.33 78.88a55.75 55.75 0 0 1 -.24-78.61l-72.47 72.44 39.44 39.44z" fill="url(#jira-a)"/>
            <path d="m141.53 111.91-33.2 33.21a55.77 55.77 0 0 1 0 78.86l72.67-72.63z" fill="url(#jira-b)"/>
          </svg>
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
        <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.53 2c0 .263.073.51.2.72L16.13 12l-4.4 9.28c-.127.21-.2.457-.2.72H9.47c0-.263-.073-.51-.2-.72L4.87 12l4.4-9.28c.127-.21.2-.457.2-.72h2.06z"/>
          <path d="M12.47 2c0 .263.073.51.2.72L17.07 12l-4.4 9.28c-.127.21-.2.457-.2.72h-2.06c0-.263-.073-.51-.2-.72L5.83 12l4.4-9.28c.127-.21.2-.457.2-.72h2.06z"/>
        </svg>
        Jira Integration
      </h3>

      <div className="space-y-4">
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
              Jira Username/Email
            </label>
            <input
              id="jira-login"
              ref={loginRef}
              type="text"
              autoComplete="username"
              placeholder="Enter your Jira username or email"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="jira-password" className="block text-sm font-medium text-gray-700 mb-2">
              Jira Password/API Token
            </label>
            <div className="flex gap-2">
              <input
                id="jira-password"
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your Jira password or API token"
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
            onClick={handleLogin}
            disabled={isConnecting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.53 2c0 .263.073.51.2.72L16.13 12l-4.4 9.28c-.127.21-.2.457-.2.72H9.47c0-.263-.073-.51-.2-.72L4.87 12l4.4-9.28c.127-.21.2-.457.2-.72h2.06z"/>
                  <path d="M12.47 2c0 .263.073.51.2.72L17.07 12l-4.4 9.28c-.127.21-.2.457-.2.72h-2.06c0-.263-.073-.51-.2-.72L5.83 12l4.4-9.28c.127-.21.2-.457.2-.72h2.06z"/>
                </svg>
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
      </div>
    </div>
  );
}
