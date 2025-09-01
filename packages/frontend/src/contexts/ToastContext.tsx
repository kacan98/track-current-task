import React, { createContext, useContext, type ReactNode } from 'react';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/ui/Toast';

export interface ToastContextType {
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info', duration?: number) => void;
  hideToast: () => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const { toast, showSuccess, showError, showInfo, showToast, hideToast } = useToast();

  return (
    <ToastContext.Provider value={{
      showSuccess,
      showError,
      showInfo,
      showToast,
      hideToast
    }}>
      {children}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </ToastContext.Provider>
  );
};

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};