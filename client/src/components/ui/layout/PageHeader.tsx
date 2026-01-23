import React from 'react';
import { Button } from '../Button';

interface PageHeaderProps {
  title: string;
  description?: string;
  backUrl?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  backUrl,
  actions
}) => {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        {backUrl && (
          <Button
            variant="secondary"
            onClick={() => window.location.href = backUrl}
            className="flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {description && <p className="text-gray-600 mt-2">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};
