import { useState, useEffect, useRef } from 'react';
import { loginToJira, getAuthStatus, logoutFromJira } from '../services/JiraIntegration';
import { Button } from './Button';

interface JiraCredentialsFormProps {
  onAuthSuccess?: () => void;
}

export function JiraCredentialsForm({ onAuthSuccess }: JiraCredentialsFormProps = {}) {
  const loginRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const status = await getAuthStatus();
      setAuthStatus(status);
    } catch (e) {
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
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await loginToJira(login, password);
      setAuthStatus({ authenticated: true });
      setSuccess('Successfully authenticated! Redirecting...');
      setTimeout(() => {
        onAuthSuccess?.();
      }, 2000);
    } catch (e: any) {
      setError(e?.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutFromJira();
      setAuthStatus({ authenticated: false });
    } catch (e: any) {
      setError(e?.message || 'Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-6 border border-blue-200 rounded-xl bg-white/90 shadow-lg max-w-sm mx-auto my-8">
        <div className="font-bold text-blue-800 text-lg mb-1">Checking authentication...</div>
      </div>
    );
  }

  if (authStatus?.authenticated) {
    return (
      <div className="flex flex-col gap-3 p-6 border border-blue-200 rounded-xl bg-white/90 shadow-lg max-w-sm mx-auto my-8">
        <div className="font-bold text-blue-800 text-lg mb-1 flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Jira Authentication Active
        </div>
        <Button
          variant="secondary"
          onClick={handleLogout}
          type="button"
          className="mt-3 border border-red-200 text-red-700 hover:bg-red-50 transition"
          disabled={loading}
        >
          {loading ? 'Logging out...' : 'Logout'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-6 border border-blue-200 rounded-xl bg-white/90 shadow-lg max-w-sm mx-auto my-8">
      <label className="font-semibold text-blue-900">Jira Login</label>
      <input
        ref={loginRef}
        className="border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-blue-900 bg-blue-50 placeholder:text-blue-300"
        type="text"
        autoComplete="username"
        placeholder="Enter your Jira login"
      />
      <label className="font-semibold text-blue-900">Jira Password</label>
      <div className="flex gap-2 items-center">
        <input
          ref={passwordRef}
          className="border border-blue-200 rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-blue-900 bg-blue-50 placeholder:text-blue-300"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Enter your Jira password"
        />
        <Button
          type="button"
          className="text-xs text-blue-700 underline px-2 py-1 h-auto hover:text-blue-900 transition"
          onClick={() => setShowPassword(v => !v)}
        >
          {showPassword ? 'Hide' : 'Show'}
        </Button>
      </div>
      <Button
        variant="primary"
        onClick={handleLogin}
        type="button"
        className="mt-2 w-full font-semibold tracking-wide hover:bg-blue-700/90 transition"
        disabled={loading}
      >
        {loading ? 'Logging in...' : 'Login'}
      </Button>
      <div className="mt-2 text-sm flex items-center gap-2">
        <span className="font-semibold">Auth status:</span>
        {authStatus?.authenticated ? (
          <span className="text-green-700 font-semibold flex items-center gap-1"><span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />Authenticated</span>
        ) : (
          <span className="text-red-500 font-semibold flex items-center gap-1"><span className="inline-block w-2 h-2 bg-red-400 rounded-full animate-pulse" />Not authenticated</span>
        )}
      </div>
      {success && <div className="text-green-600 text-xs mt-1 border border-green-200 bg-green-50 rounded px-2 py-1">{success}</div>}
      {error && <div className="text-red-600 text-xs mt-1 border border-red-200 bg-red-50 rounded px-2 py-1">{error}</div>}
    </div>
  );
}
