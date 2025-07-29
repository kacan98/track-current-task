import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export function Button({ className = '', variant = 'primary', ...props }: ButtonProps) {
  let base =
    variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-300'
      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-gray-200';
  return (
    <button
      className={`px-4 py-2 rounded-lg shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer ${base} ${className}`}
      {...props}
    />
  );
}