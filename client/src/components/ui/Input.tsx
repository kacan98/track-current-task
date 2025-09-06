import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  helpText?: string;
  error?: string;
  isError?: boolean;
}

export function Input({ label, icon, helpText, error, isError, className = '', ...props }: InputProps) {
  const baseClassName = "w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white shadow-sm text-sm";
  const borderClassName = isError || error 
    ? "border-red-300 focus:ring-red-500 focus:border-red-500" 
    : "border-gray-200 focus:ring-blue-500 focus:border-transparent";
  
  return (
    <div>
      {label && (
        <label htmlFor={props.id} className="block text-sm font-medium text-gray-700 mb-2">
          {icon ? (
            <span className="flex items-center gap-2">
              {icon}
              {label}
            </span>
          ) : (
            label
          )}
        </label>
      )}
      <input
        {...props}
        className={`${baseClassName} ${borderClassName} ${className}`.trim()}
      />
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
      {!error && helpText && (
        <p className="text-xs text-gray-500 mt-1">{helpText}</p>
      )}
    </div>
  );
}