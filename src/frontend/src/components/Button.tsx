import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'compact';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'compact', className = '', ...props }) => {
  let base =
    'inline-flex items-center justify-center border rounded-lg focus:outline-none transition text-base font-semibold select-none min-h-[40px] px-5 py-2 shadow-sm';
  let variants: Record<string, string> = {
    primary:
      'bg-blue-600 text-white border-blue-700 hover:bg-blue-700 hover:border-blue-800 focus:ring-2 focus:ring-blue-400',
    secondary:
      'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 hover:border-gray-400',
    compact:
      'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-900 shadow-md',
  };
  return (
    <button
      className={
        `${base} ${variants[variant]} ${className}` +
        (!props.disabled ? ' cursor-pointer ' : ' cursor-not-allowed opacity-60 ')
      }
      {...props}
    >
      {children}
    </button>
  );
};
