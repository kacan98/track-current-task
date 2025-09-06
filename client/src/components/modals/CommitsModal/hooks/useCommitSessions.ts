import { useMemo } from 'react';

interface GitHubCommit {
  sha: string;
  shortSha: string;
  message: string;
  date: string;
  url: string;
  repository: { name: string; fullName: string };
  author: { name: string; email: string; date: string };
  branch: string;
  pullRequest: { number: number; title: string; branchDeleted: boolean; url: string } | null;
}

export interface CommitSession {
  taskId: string | null;
  taskIdSource: 'branch' | 'pr' | null;
  branch: string;
  prTitle: string | null;
  prNumber: number | null;
  startTime: Date;
  endTime: Date;
  commits: GitHubCommit[];
  durationMinutes: number;
  startsBeforeWorkHours: boolean;
  endsAfterWorkHours: boolean;
}

export const useCommitSessions = (
  commits: GitHubCommit[],
  date: string,
  dayStartTime: string,
  dayEndTime: string,
  taskIdRegex: string
) => {
  const sessions = useMemo(() => {
    // Function to extract task ID from branch name and PR title using regex
    const extractTaskId = (branchName: string, prTitle?: string): string | null => {
      try {
        // Try branch name first
        const branchMatch = branchName.match(new RegExp(taskIdRegex));
        if (branchMatch) return branchMatch[0];
        
        // Fallback to PR title if available
        if (prTitle) {
          const titleMatch = prTitle.match(new RegExp(taskIdRegex));
          if (titleMatch) return titleMatch[0];
        }
        
        return null;
      } catch (error) {
        console.warn('Invalid regex pattern:', taskIdRegex, error);
        return null;
      }
    };

    // Function to group commits into work sessions
    const groupCommitsIntoSessions = (commits: GitHubCommit[]): CommitSession[] => {
      if (!commits.length) return [];

      // Parse times for the given date
      const dayStartDateTime = new Date(`${date}T${dayStartTime}:00`);
      const dayEndDateTime = new Date(`${date}T${dayEndTime}:00`);

      // Sort commits by time
      const sortedCommits = [...commits].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Check if we have commits outside work hours
      const firstCommitTime = new Date(sortedCommits[0].date);
      const lastCommitTime = new Date(sortedCommits[sortedCommits.length - 1].date);
      
      const useActualStart = firstCommitTime < dayStartDateTime;
      const useActualEnd = lastCommitTime > dayEndDateTime;

      // Group consecutive commits by branch
      let currentBranch = '';
      let currentCommits: GitHubCommit[] = [];
      const branchGroups: Array<{ branch: string; commits: GitHubCommit[] }> = [];

      for (const commit of sortedCommits) {
        if (commit.branch !== currentBranch && currentCommits.length > 0) {
          branchGroups.push({ branch: currentBranch, commits: [...currentCommits] });
          currentCommits = [];
        }
        currentBranch = commit.branch;
        currentCommits.push(commit);
      }

      if (currentCommits.length > 0) {
        branchGroups.push({ branch: currentBranch, commits: currentCommits });
      }

      const sessions: CommitSession[] = [];

      // Smart session start time
      let sessionStart = useActualStart ? firstCommitTime : dayStartDateTime;

      for (let i = 0; i < branchGroups.length; i++) {
        const group = branchGroups[i];
        const groupLastCommitTime = new Date(group.commits[group.commits.length - 1].date);
        
        // Session ends at the last commit time of this branch group
        let sessionEnd = groupLastCommitTime;
        
        // For the final session, use smart end boundary
        if (i === branchGroups.length - 1) {
          sessionEnd = useActualEnd ? lastCommitTime : (dayEndDateTime > groupLastCommitTime ? dayEndDateTime : groupLastCommitTime);
        }

        const durationMinutes = Math.round((sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60));
        
        // Extract task ID from branch and PR title
        const firstCommitWithPR = group.commits.find(c => c.pullRequest);
        const prTitle = firstCommitWithPR?.pullRequest?.title;
        const prNumber = firstCommitWithPR?.pullRequest?.number;
        const taskId = extractTaskId(group.branch, prTitle);
        const taskIdSource = taskId ? (group.branch.includes(taskId) ? 'branch' : 'pr') : null;

        sessions.push({
          taskId,
          taskIdSource,
          branch: group.branch,
          prTitle: prTitle || null,
          prNumber: prNumber || null,
          startTime: sessionStart,
          endTime: sessionEnd,
          commits: group.commits,
          durationMinutes,
          startsBeforeWorkHours: sessionStart < dayStartDateTime,
          endsAfterWorkHours: sessionEnd > dayEndDateTime
        });

        // Next session starts where this one ended (at the last commit of this branch)
        sessionStart = groupLastCommitTime;
      }

      return sessions;
    };

    return groupCommitsIntoSessions(commits);
  }, [commits, date, dayStartTime, dayEndTime, taskIdRegex]);

  return sessions;
};