import { useMemo } from 'react';
import { commitService, type GitHubCommit } from '../../../../services/commitService';

export { type CommitSession } from '../../../../services/commitService';

export const useCommitSessions = (
  commits: GitHubCommit[],
  date: string,
  dayStartTime: string,
  dayEndTime: string,
  taskIdRegex: string
) => {
  const sessions = useMemo(() => {
    const settings = {
      dayStartTime,
      dayEndTime,
      taskIdRegex
    };
    
    return commitService.processCommitsToSessions(commits, date, settings);
  }, [commits, date, dayStartTime, dayEndTime, taskIdRegex]);

  return sessions;
};