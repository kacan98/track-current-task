import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
}

export function Button({ className = '', variant = 'secondary', size = 'md', ...props }: ButtonProps) {
  const base =
    variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:bg-blue-800 focus:ring-blue-300'
      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:shadow-md hover:border-gray-300 active:bg-gray-100 focus:ring-gray-200';
  
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-sm' : 'px-4 py-2';
  
  return (
    <button
      className={`${sizeClass} rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:shadow-sm cursor-pointer ${base} ${className}`}
      {...props}
    />
  );
}