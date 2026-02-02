import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckLogsModal } from '@/components/modals/CheckLogsModal';
import type { Check } from '@shared/github.model';

interface FailedCheckItemProps {
  check: Check;
  repoFullName: string;
  onRerun: (checkId: number, checkName: string) => Promise<void>;
  isRerunning: boolean;
  allFailedChecks?: Check[] | undefined;
}

export const FailedCheckItem: React.FC<FailedCheckItemProps> = ({
  check,
  repoFullName,
  onRerun,
  isRerunning,
  allFailedChecks
}) => {
  const [showLogs, setShowLogs] = useState(false);

  const handleRerun = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await onRerun(check.id, check.name);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 bg-white border border-red-200 rounded text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="material-symbols-outlined text-red-600" style={{ fontSize: '16px' }}>
            cancel
          </span>
          <span className="font-medium text-gray-900 truncate">{check.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowLogs(true);
            }}
            size="sm"
            variant="secondary"
            className="text-xs font-medium flex items-center gap-1 whitespace-nowrap"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>description</span>
            Log
          </Button>
          <Button
            onClick={handleRerun}
            disabled={isRerunning || !check.id}
            size="sm"
            variant="secondary"
            className="text-xs font-medium flex items-center gap-1 whitespace-nowrap"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>replay</span>
            {isRerunning ? '...' : 'Rerun'}
          </Button>
        </div>
      </div>

      <CheckLogsModal
        isOpen={showLogs}
        onClose={() => setShowLogs(false)}
        checkId={check.id}
        checkName={check.name}
        repoFullName={repoFullName}
        allFailedChecks={allFailedChecks}
      />
    </>
  );
};
