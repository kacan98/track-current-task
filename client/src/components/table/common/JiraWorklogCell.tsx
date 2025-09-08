export type JiraWorklogCellProps = {
  keyId: string;
  loadingWorklogs: Record<string, boolean>;
  worklogError: Record<string, string>;
  worklogTotals: Record<string, number>;
};

export function JiraWorklogCell({ keyId, loadingWorklogs, worklogError, worklogTotals }: JiraWorklogCellProps) {
  return (
    <div className="text-xs mt-1 text-blue-700 min-h-[1.2em]">
      {loadingWorklogs[keyId]
        ? <span className="italic text-blue-400">Jira: ...</span>
        : worklogError[keyId]
          ? <span className="text-red-500">Jira: {worklogError[keyId]}</span>
          : <span>Jira: {worklogTotals[keyId] ? (worklogTotals[keyId]/3600).toFixed(2) : '0.00'}h</span>
      }
    </div>
  );
}
