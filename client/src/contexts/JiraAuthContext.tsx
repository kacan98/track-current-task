import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getAuthStatus } from '../services/JiraIntegration';

interface JiraAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuthStatus: () => Promise<void>;
}

const JiraAuthContext = createContext<JiraAuthContextType | undefined>(undefined);

export function JiraAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const status = await getAuthStatus();
      setIsAuthenticated(status.authenticated);
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <JiraAuthContext.Provider value={{ isAuthenticated, isLoading, checkAuthStatus }}>
      {children}
    </JiraAuthContext.Provider>
  );
}

export function useJiraAuth() {
  const context = useContext(JiraAuthContext);
  if (context === undefined) {
    throw new Error('useJiraAuth must be used within a JiraAuthProvider');
  }
  return context;
}