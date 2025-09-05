import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
}

interface GitHubCommit {
  sha: string;
  shortSha: string;
  message: string;
  date: string;
  url: string;
  repository: {
    name: string;
    fullName: string;
  };
  author: {
    name: string;
    email: string;
    date: string;
  };
}

interface GitHubAuthContextType {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  isLoading: boolean;
  login: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  getCommitsForDate: (date: string) => Promise<GitHubCommit[]>;
}

const GitHubAuthContext = createContext<GitHubAuthContextType | undefined>(undefined);

export function GitHubAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/github/auth/status', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        setIsAuthenticated(true);
        setUser(data.user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to check GitHub auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (code: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/github/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        throw new Error('GitHub authentication failed');
      }

      const data = await response.json();
      
      if (data.success && data.user) {
        setIsAuthenticated(true);
        setUser(data.user);
      } else {
        throw new Error('Authentication response invalid');
      }
    } catch (error) {
      console.error('GitHub login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/github/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('GitHub logout failed:', error);
      // Still clear local state even if server request fails
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const getCommitsForDate = async (date: string): Promise<GitHubCommit[]> => {
    try {
      const response = await fetch(`/api/github/commits?date=${date}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, update auth state
          setIsAuthenticated(false);
          setUser(null);
          throw new Error('GitHub authentication expired. Please reconnect.');
        }
        throw new Error('Failed to fetch commits');
      }

      const data = await response.json();
      return data.commits || [];
    } catch (error) {
      console.error('Failed to fetch GitHub commits:', error);
      throw error;
    }
  };

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value = {
    isAuthenticated,
    user,
    isLoading,
    login,
    logout,
    checkAuthStatus,
    getCommitsForDate
  };

  return (
    <GitHubAuthContext.Provider value={value}>
      {children}
    </GitHubAuthContext.Provider>
  );
}

export function useGitHubAuth() {
  const context = useContext(GitHubAuthContext);
  if (!context) {
    throw new Error('useGitHubAuth must be used within GitHubAuthProvider');
  }
  return context;
}

// Helper function to generate GitHub OAuth URL
export function getGitHubAuthUrl(): string {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error('GitHub client ID not configured');
  }

  // Generate and store state for CSRF protection
  const state = crypto.randomUUID();
  sessionStorage.setItem('github_oauth_state', state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${window.location.origin}/github/callback`,
    scope: 'repo',
    state: state
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}