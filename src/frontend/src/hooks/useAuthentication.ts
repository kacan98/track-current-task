import { useState, useEffect } from 'react';
import { getAuthStatus } from '../services/JiraIntegration';

interface AuthenticationState {
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
  authStatus: { authenticated: boolean } | null;
}

export const useAuthentication = () => {
  const [authState, setAuthState] = useState<AuthenticationState>({
    isAuthenticated: false,
    isCheckingAuth: true,
    authStatus: null
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await getAuthStatus();
        setAuthState({
          isAuthenticated: status.authenticated,
          isCheckingAuth: false,
          authStatus: status
        });
      } catch (error: unknown) {
        console.error('Failed to check auth status:', error);
        setAuthState({
          isAuthenticated: false,
          isCheckingAuth: false,
          authStatus: null
        });
      }
    };

    checkAuth();
  }, []);

  const handleAuthSuccess = () => {
    setAuthState(prev => ({
      ...prev,
      isAuthenticated: true,
      authStatus: { authenticated: true }
    }));
  };

  const skipAuth = () => {
    setAuthState(prev => ({
      ...prev,
      isAuthenticated: true,
      authStatus: { authenticated: true }
    }));
  };

  return {
    ...authState,
    handleAuthSuccess,
    skipAuth
  };
};