import React from 'react';

interface ErrorDisplayProps {
  title?: string;
  error: string;
  onDismiss?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'Error',
  error,
  onDismiss
}) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-red-600 mt-0.5">error</span>
        <div className="flex-1">
          <h4 className="font-semibold text-red-900 mb-1">{title}</h4>
          <p className="text-sm text-red-700">{error}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>
    </div>
  );
};
