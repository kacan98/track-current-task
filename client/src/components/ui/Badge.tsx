import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: string;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800 border-gray-300',
  success: 'bg-green-100 text-green-800 border-green-300',
  warning: 'bg-orange-100 text-orange-700 border-orange-300',
  danger: 'bg-red-100 text-red-700 border-red-300',
  info: 'bg-blue-100 text-blue-700 border-blue-300'
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  icon,
  className = ''
}) => {
  const variantClass = variantStyles[variant];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${variantClass} ${className}`}>
      {icon && (
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
          {icon}
        </span>
      )}
      {children}
    </span>
  );
};

// Status badge variant (rounded full, for state indicators)
interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  children,
  variant = 'default',
  className = ''
}) => {
  const variantClass = variantStyles[variant];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variantClass} ${className}`}>
      {children}
    </span>
  );
};
