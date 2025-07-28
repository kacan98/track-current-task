import { useState } from 'react';
import { getAndCacheJiraToken, getCachedJiraToken } from '../services/JiraIntegration';
import { Button } from './Button';

export function JiraCredentialsForm() {
  const [login, setLogin] = useState(localStorage.getItem('jiraLogin') || '');
  const [password, setPassword] = useState(localStorage.getItem('jiraPassword') || '');
  const [showPassword, setShowPassword] = useState(false);
  const [tokenStatus, setTokenStatus] = useState(() => !!getCachedJiraToken());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = getCachedJiraToken();

  const handleSave = () => {
    localStorage.setItem('jiraLogin', login);
    localStorage.setItem('jiraPassword', password);
  };

  const handleClear = () => {
    localStorage.removeItem('jiraLogin');
    localStorage.removeItem('jiraPassword');
    setLogin('');
    setPassword('');
  };

  const handleGenerateToken = async () => {
    setLoading(true);
    setError(null);
    try {
      await getAndCacheJiraToken(login, password);
      setTokenStatus(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to generate token');
      setTokenStatus(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteToken = () => {
    localStorage.removeItem('jiraToken');
    setTokenStatus(false);
  };

  if (token) {
    return (
      <div className="flex flex-col gap-2 p-4 border rounded-lg bg-white/80 shadow max-w-xs mx-auto my-4">
        <div className="font-semibold text-blue-900 mb-2">Jira Token Preview</div>
        <div className="bg-gray-100 rounded px-2 py-1 font-mono text-xs break-all select-all">
          {token.slice(0, 6)}...{token.slice(-6)}
        </div>
        <Button
          variant="secondary"
          onClick={handleDeleteToken}
          type="button"
          className="mt-4"
        >
          Delete Current Token
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 border rounded-lg bg-white/80 shadow max-w-xs mx-auto my-4">
      <label className="font-semibold text-blue-900">Jira Login</label>
      <input
        className="border rounded px-2 py-1"
        type="text"
        value={login}
        onChange={e => setLogin(e.target.value)}
        autoComplete="username"
      />
      <label className="font-semibold text-blue-900">Jira Password</label>
      <div className="flex gap-2 items-center">
        <input
          className="border rounded px-2 py-1 flex-1"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <Button
          type="button"
          variant="compact"
          className="text-xs text-blue-700 underline px-2 py-1 h-auto"
          onClick={() => setShowPassword(v => !v)}
        >
          {showPassword ? 'Hide' : 'Show'}
        </Button>
      </div>
      <div className="flex gap-2 mt-2">
        <Button
          variant="primary"
          onClick={handleSave}
          type="button"
          className="flex-1"
        >
          Save
        </Button>
        <Button
          variant="secondary"
          onClick={handleClear}
          type="button"
          className="flex-1"
        >
          Clear
        </Button>
      </div>
      <Button
        variant="primary"
        onClick={handleGenerateToken}
        type="button"
        className="mt-2"
        disabled={loading || !login || !password}
      >
        {loading ? 'Generating...' : 'Generate Token'}
      </Button>
      <div className="mt-2 text-sm">
        Token status: {tokenStatus ? <span className="text-green-700 font-semibold">Stored</span> : <span className="text-red-500 font-semibold">Not stored</span>}
      </div>
      {error && <div className="text-red-600 text-xs mt-1">{error}</div>}
    </div>
  );
}
