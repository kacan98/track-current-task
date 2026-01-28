import React from 'react';

interface TestingAlertProps {
  show: boolean;
}

export const TestingAlert: React.FC<TestingAlertProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="mb-4 bg-blue-50 border border-blue-300 rounded-lg p-3">
      <div className="flex items-start gap-2">
        <span className="material-symbols-outlined text-blue-600 text-lg">science</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900">Ready for Testing</p>
          <p className="text-xs text-blue-700 mt-0.5">
            All PRs are merged but test subtasks are still pending
          </p>
        </div>
      </div>
    </div>
  );
};
