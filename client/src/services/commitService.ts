
export interface GitHubCommit {
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

export interface LogEntry {
  date: string;
  taskId: string;
  duration: number;
  description: string;
}

export interface CommitServiceSettings {
  dayStartTime: string;
  dayEndTime: string;
  taskIdRegex: string;
}

class CommitService {
  private getCommitsForDateFromAPI: ((date: string) => Promise<GitHubCommit[]>) | null = null;

  // Initialize with the GitHub auth context
  initialize(getCommitsForDate: (date: string) => Promise<GitHubCommit[]>) {
    this.getCommitsForDateFromAPI = getCommitsForDate;
  }

  // Get commits for a single date
  async getCommitsForDate(date: string): Promise<GitHubCommit[]> {
    if (!this.getCommitsForDateFromAPI) {
      throw new Error('CommitService not initialized. Call initialize() first.');
    }
    return await this.getCommitsForDateFromAPI(date);
  }

  // Get commits for a date range
  async getCommitsForDateRange(startDate: string, endDate: string): Promise<{ [date: string]: GitHubCommit[] }> {
    const commits: { [date: string]: GitHubCommit[] } = {};
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      try {
        commits[dateStr] = await this.getCommitsForDate(dateStr);
      } catch (error) {
        console.warn(`Failed to fetch commits for ${dateStr}:`, error);
        commits[dateStr] = [];
      }
    }
    
    return commits;
  }

  // Extract task ID from branch name and PR title using regex
  private extractTaskId(branchName: string, prTitle: string | null, taskIdRegex: string): { taskId: string | null; source: 'branch' | 'pr' | null } {
    try {
      // Try branch name first
      const branchMatch = branchName.match(new RegExp(taskIdRegex));
      if (branchMatch) {
        return { taskId: branchMatch[0], source: 'branch' };
      }
      
      // Fallback to PR title if available
      if (prTitle) {
        const titleMatch = prTitle.match(new RegExp(taskIdRegex));
        if (titleMatch) {
          return { taskId: titleMatch[0], source: 'pr' };
        }
      }
      
      return { taskId: null, source: null };
    } catch (error) {
      console.warn('Invalid regex pattern:', taskIdRegex, error);
      return { taskId: null, source: null };
    }
  }

  // Process commits into work sessions (extracted from useCommitSessions)
  processCommitsToSessions(commits: GitHubCommit[], date: string, settings: CommitServiceSettings): CommitSession[] {
    if (!commits.length) return [];

    // Parse times for the given date
    const dayStartDateTime = new Date(`${date}T${settings.dayStartTime}:00`);
    const dayEndDateTime = new Date(`${date}T${settings.dayEndTime}:00`);

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
      const prTitle = firstCommitWithPR?.pullRequest?.title || null;
      const prNumber = firstCommitWithPR?.pullRequest?.number || null;
      const { taskId, source: taskIdSource } = this.extractTaskId(group.branch, prTitle, settings.taskIdRegex);

      sessions.push({
        taskId,
        taskIdSource,
        branch: group.branch,
        prTitle,
        prNumber,
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
  }

  // Generate log entries from sessions (only for sessions with task IDs)
  generateLogEntriesFromSessions(sessions: CommitSession[], date: string): LogEntry[] {
    const sessionsWithTaskIds = sessions.filter(session => session.taskId);
    
    // Group sessions by task ID to merge duplicates
    const taskGroups: { [taskId: string]: CommitSession[] } = {};
    sessionsWithTaskIds.forEach(session => {
      const taskId = session.taskId!;
      if (!taskGroups[taskId]) {
        taskGroups[taskId] = [];
      }
      taskGroups[taskId].push(session);
    });

    // Create merged log entries for each task ID
    return Object.entries(taskGroups).map(([taskId, taskSessions]) => {
      // Sum up all duration minutes for this task ID
      const totalDurationMinutes = taskSessions.reduce((sum, session) => sum + session.durationMinutes, 0);
      const durationHours = Math.ceil(totalDurationMinutes / 15) * 0.25; // Round to nearest 0.25h
      
      // Use the best description available (prefer PR titles over branch names)
      let description: string;
      const sessionWithPR = taskSessions.find(session => session.prTitle);
      const allBranches = [...new Set(taskSessions.map(s => s.branch))]; // Unique branches
      
      if (sessionWithPR?.prTitle) {
        description = `${taskId}: ${sessionWithPR.prTitle}`;
      } else if (allBranches.length === 1) {
        description = `${taskId}: Work on ${allBranches[0]}`;
      } else {
        description = `${taskId}: Work on ${allBranches.length} branches`;
      }

      return {
        date,
        taskId,
        duration: durationHours,
        description
      };
    });
  }

  // Auto-fill entire week with log entries
  async autoFillWeek(
    weekStartDate: string, 
    onAddLogEntry: (entry: LogEntry) => void,
    settings: CommitServiceSettings
  ): Promise<{ processed: number; added: number }> {
    const start = new Date(weekStartDate);
    let processed = 0;
    let added = 0;

    // Process each day of the week (7 days)
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      try {
        const commits = await this.getCommitsForDate(dateStr);
        processed++;

        if (commits.length > 0) {
          const sessions = this.processCommitsToSessions(commits, dateStr, settings);
          const logEntries = this.generateLogEntriesFromSessions(sessions, dateStr);
          
          // Add each log entry
          logEntries.forEach(entry => {
            onAddLogEntry(entry);
            added++;
          });
        }
      } catch (error) {
        console.error(`Failed to process commits for ${dateStr}:`, error);
      }
    }

    return { processed, added };
  }
}

// Export singleton instance
export const commitService = new CommitService();