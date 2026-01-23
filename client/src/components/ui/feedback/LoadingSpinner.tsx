import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  centered?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 'md',
  centered = true
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-b-2',
    lg: 'h-12 w-12 border-b-2'
  };

  const paddingClass = centered ? 'py-12' : 'py-4';

  return (
    <div className={`text-center ${paddingClass}`}>
      <div className={`inline-block animate-spin rounded-full ${sizeClasses[size]} border-blue-600`}></div>
      {message && <p className="mt-4 text-gray-600">{message}</p>}
    </div>
  );
};
