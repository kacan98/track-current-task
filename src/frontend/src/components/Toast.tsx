import React, { useEffect } from 'react';

export interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 2500 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-2 rounded shadow-lg animate-fade-in">
      {message}
    </div>
  );
};
