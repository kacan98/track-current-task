import React from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  return (
    <div
      className={`fixed top-6 right-6 z-50 px-4 py-2 rounded shadow-lg text-white transition-opacity duration-300 ${
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
      }`}
      role="alert"
      onClick={onClose}
      style={{ cursor: onClose ? 'pointer' : 'default' }}
    >
      {message}
    </div>
  );
};

export default Toast;
