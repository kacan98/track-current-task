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
      <div className="flex flex-col gap-3 p-6 border border-blue-200 rounded-xl bg-white/90 shadow-lg max-w-sm mx-auto my-8">
        <div className="font-bold text-blue-800 text-lg mb-1 flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Jira Token Stored
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg px-3 py-2 font-mono text-sm text-blue-900 tracking-wider border border-blue-200 select-all shadow-inner">
          {token.slice(0, 6)}<span className="opacity-60">...{token.slice(-6)}</span>
        </div>
        <Button
          variant="secondary"
          onClick={handleDeleteToken}
          type="button"
          className="mt-3 border border-red-200 text-red-700 hover:bg-red-50 transition"
        >
          Delete Current Token
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-6 border border-blue-200 rounded-xl bg-white/90 shadow-lg max-w-sm mx-auto my-8">
      <label className="font-semibold text-blue-900">Jira Login</label>
      <input
        className="border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-blue-900 bg-blue-50 placeholder:text-blue-300"
        type="text"
        value={login}
        onChange={e => setLogin(e.target.value)}
        autoComplete="username"
        placeholder="Enter your Jira login"
      />
      <label className="font-semibold text-blue-900">Jira Password</label>
      <div className="flex gap-2 items-center">
        <input
          className="border border-blue-200 rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-blue-900 bg-blue-50 placeholder:text-blue-300"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Enter your Jira password"
        />
        <Button
          type="button"
          variant="compact"
          className="text-xs text-blue-700 underline px-2 py-1 h-auto hover:text-blue-900 transition"
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
          className="flex-1 hover:bg-blue-700/90 transition"
        >
          Save
        </Button>
        <Button
          variant="secondary"
          onClick={handleClear}
          type="button"
          className="flex-1 hover:bg-gray-100 transition"
        >
          Clear
        </Button>
      </div>
      <Button
        variant="primary"
        onClick={handleGenerateToken}
        type="button"
        className="mt-2 w-full font-semibold tracking-wide hover:bg-blue-700/90 transition"
        disabled={loading || !login || !password}
      >
        {loading ? 'Generating...' : 'Generate Token'}
      </Button>
      <div className="mt-2 text-sm flex items-center gap-2">
        <span className="font-semibold">Token status:</span>
        {tokenStatus ? (
          <span className="text-green-700 font-semibold flex items-center gap-1"><span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />Stored</span>
        ) : (
          <span className="text-red-500 font-semibold flex items-center gap-1"><span className="inline-block w-2 h-2 bg-red-400 rounded-full animate-pulse" />Not stored</span>
        )}
      </div>
      {error && <div className="text-red-600 text-xs mt-1 border border-red-200 bg-red-50 rounded px-2 py-1">{error}</div>}
    </div>
  );
}
