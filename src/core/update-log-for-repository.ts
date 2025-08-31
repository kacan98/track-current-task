import chalk from 'chalk';
import { Config, RepositoryConfig } from '../config/config-types';
import { RepoState } from './repo-state-types';
import { LogEntry } from './file-operations';
import {
  getRepositoryInfo,
  getRepositoryName
} from '../git/git-utils';
import { getFileDiffStats, getWorkingDirDiffStats } from '../git/diff-analysis';
import { extractTaskId } from '../utils/date-utils';

// Takes mutable entries and repoState, modifies them directly.
// Returns true if time was logged, false otherwise
export async function updateLogForRepository(
  repositoryConfig: RepositoryConfig,
  config: Config,
  entries: LogEntry[], // Mutable: Log entries are added/updated here
  repoState: RepoState, // Mutable: Repo state is updated here
): Promise<boolean> {
  const repoPath = repositoryConfig.path;
  // Get all git info in one optimized call
  const repoInfo = await getRepositoryInfo(repoPath, repositoryConfig.mainBranch);
  
  const repositoryName = await getRepositoryName(repoPath);
  
  if (!repoInfo.currentBranch) {
    console.log(`Could not determine current branch for ${repoPath}. Skipping activity check for this repository.`);
    return false;
  }

  const branchName = repoInfo.currentBranch;
  const baseBranch = repoInfo.baseBranch;
  const statusToStore = repoInfo.gitStatus === null ? "<<ERROR_GIT_STATUS_FAILED>>" : repoInfo.gitStatus;
  const currentBranchHash = repoInfo.currentBranchHash;
  const baseBranchHash = repoInfo.baseBranchHash;
  const diffFiles = repoInfo.diffFiles;
  const commitsNotInBase = repoInfo.commitsNotInBase;
  const numCommitsNotInBase = commitsNotInBase ? commitsNotInBase.length : 0;
  
  // Still need these for now - could be optimized later
  const workingDirDiffStats = await getWorkingDirDiffStats(repoPath);
  const diffStats = await getFileDiffStats(repoPath, baseBranch, branchName);

  if (!repoState[repoPath]) {
    repoState[repoPath] = {};
  }

  const lastKnown = repoState[repoPath][branchName] || {};
  const isFirstTimeSeeing = !repoState[repoPath][branchName]; // True if we've never seen this branch before
  const lastKnownStatus = lastKnown.status;
  const lastKnownHash = lastKnown.commitHash;
  const lastKnownBaseHash = lastKnown.masterHash;
  const lastKnownDiffFiles = lastKnown.diffFiles;
  const lastKnownCommits = lastKnown.commitsNotInMaster;
  const lastKnownNumCommits = lastKnown.numCommitsNotInMaster;
  const lastKnownDiffStats = lastKnown.diffStats || {};
  const lastKnownWorkingDirDiffStats = lastKnown.workingDirDiffStats || {};
  const lastLogTime = lastKnown.lastLogTime || 0;

  // Determine if anything has changed (but not if it's just the first time we're seeing it)
  const statusChanged = !isFirstTimeSeeing && statusToStore !== lastKnownStatus;
  const hashChanged = !isFirstTimeSeeing && currentBranchHash !== lastKnownHash;
  const baseHashChanged = !isFirstTimeSeeing && baseBranchHash !== lastKnownBaseHash;
  const diffFilesChanged = !isFirstTimeSeeing && JSON.stringify(diffFiles) !== JSON.stringify(lastKnownDiffFiles);
  const commitsChanged = !isFirstTimeSeeing && JSON.stringify(commitsNotInBase) !== JSON.stringify(lastKnownCommits);
  const numCommitsChanged = !isFirstTimeSeeing && numCommitsNotInBase !== lastKnownNumCommits;
  // Check if working directory stats have changed
  const workingDirChanged = !isFirstTimeSeeing && JSON.stringify(workingDirDiffStats) !== JSON.stringify(lastKnownWorkingDirDiffStats);
  const diffStatsChanged = !isFirstTimeSeeing && JSON.stringify(diffStats) !== JSON.stringify(lastKnownDiffStats);

  // Check if tracking interval has passed to avoid duplicate logging
  const now = Date.now();
  const timeSinceLastLog = now - lastLogTime;
  const minimumTrackingIntervalMs = config.trackingIntervalMinutes * 60 * 1000;
  const leewayMs = 15000;
  const trackingIntervalPassed = timeSinceLastLog >= (minimumTrackingIntervalMs - leewayMs);

  const somethingChanged = (
    statusChanged ||
    hashChanged ||
    baseHashChanged ||
    diffFilesChanged ||
    commitsChanged ||
    numCommitsChanged ||
    workingDirChanged ||
    diffStatsChanged
  );

  const shouldLogTime = somethingChanged && trackingIntervalPassed && !isFirstTimeSeeing;

  // Always update the state if something changed OR if it's the first time
  if (somethingChanged || isFirstTimeSeeing) {
    repoState[repoPath][branchName] = {
      status: statusToStore,
      commitHash: currentBranchHash,
      masterHash: baseBranchHash,
      diffFiles: diffFiles,
      commitsNotInMaster: commitsNotInBase,
      numCommitsNotInMaster: numCommitsNotInBase,
      diffStats: diffStats,
      workingDirDiffStats: workingDirDiffStats,
      lastLogTime: shouldLogTime ? now : lastLogTime // Only update the time if we're logging
    };

    const extractedTaskId = extractTaskId(branchName, config.taskIdRegEx);
    const taskIdToLog = extractedTaskId || branchName;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logIntervalHours = config.trackingIntervalMinutes / 60;

    // Only log time if the tracking interval has passed
    if (shouldLogTime) {
      const existingEntryIndex = entries.findIndex(
        entry => entry.date === today && entry.taskId === taskIdToLog && entry.repository === repositoryName
      );

      if (existingEntryIndex !== -1) {
        entries[existingEntryIndex].hours = parseFloat((entries[existingEntryIndex].hours + logIntervalHours).toFixed(4));
      } else {
        entries.push({ date: today, taskId: taskIdToLog, repository: repositoryName, hours: logIntervalHours });
      }
      console.log(chalk.green(`Logged ${logIntervalHours.toFixed(2)} hours for ${chalk.cyan(taskIdToLog)} (repo: ${chalk.yellow(repoPath)}, branch: ${chalk.yellow(branchName)})`));
      return true;
    } else if (isFirstTimeSeeing) {
      console.log(chalk.blue(`Initial state captured for ${chalk.cyan(taskIdToLog)} (repo: ${chalk.yellow(repoPath)}, branch: ${chalk.yellow(branchName)}). No time logged on first run.`));
      return false;
    } else {
      console.log(chalk.yellow(`Changes detected in ${chalk.cyan(repoPath)} on branch ${chalk.cyan(branchName)}, but tracking interval (${config.trackingIntervalMinutes} minutes) has not passed since last log. No time logged.`));
      return false;
    }
  } else {
    console.log(chalk.gray(`No new changes in ${chalk.cyan(repoPath)} on branch ${chalk.cyan(branchName)}.`));
    return false;
  }
}
