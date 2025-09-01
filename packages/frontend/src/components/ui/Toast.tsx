import React, { useEffect } from 'react';

export interface ToastProps {
  message: string;
  onClose?: () => void;
  duration?: number;
  type?: 'success' | 'error' | 'info';
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 2500, type = 'info' }) => {
  useEffect(() => {
    if (!onClose) return;
    
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-gray-900';

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${bgColor} text-white px-4 py-2 rounded shadow-lg animate-fade-in`}>
      {message}
    </div>
  );
};
