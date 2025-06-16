import chalk from 'chalk';
import { Config } from '../config/config-types';
import { RepoState } from './repo-state-types';
import { LogEntry } from './file-operations';
import {
  getCurrentBranch,
  getGitStatus,
  getDefaultBaseBranch,
  getLatestCommitHash,
  getDiffFilesWithBase,
  getCommitsNotInBase
} from '../git/git-utils';
import { getFileDiffStats, getWorkingDirDiffStats } from '../git/diff-analysis';
import { extractTaskId } from '../utils/date-utils';

// Takes mutable entries and repoState, modifies them directly.
// Returns true if time was logged, false otherwise
export async function updateLogForRepository(
  repoPath: string,
  config: Config,
  entries: LogEntry[], // Mutable: Log entries are added/updated here
  repoState: RepoState, // Mutable: Repo state is updated here
  mainBranch?: string
): Promise<boolean> {
  const branchName = await getCurrentBranch(repoPath);
  if (!branchName) {
    console.log(`Could not determine current branch for ${repoPath}. Skipping activity check for this repository.`);
    return false;
  }

  const baseBranch = await getDefaultBaseBranch(repoPath, mainBranch);

  const currentGitStatus = await getGitStatus(repoPath);
  const statusToStore = currentGitStatus === null ? "<<ERROR_GIT_STATUS_FAILED>>" : currentGitStatus;

  const currentBranchHash = await getLatestCommitHash(repoPath, branchName);
  const baseBranchHash = await getLatestCommitHash(repoPath, baseBranch);
  const diffFiles = await getDiffFilesWithBase(repoPath, baseBranch, branchName);
  const commitsNotInBase = await getCommitsNotInBase(repoPath, baseBranch, branchName);
  const numCommitsNotInBase = commitsNotInBase ? commitsNotInBase.length : 0;
  const workingDirDiffStats = await getWorkingDirDiffStats(repoPath);
  const diffStats = await getFileDiffStats(repoPath, baseBranch, branchName);

  if (!repoState[repoPath]) {
    repoState[repoPath] = {};
  }

  const lastKnown = repoState[repoPath][branchName] || {};
  const lastKnownStatus = lastKnown.status;
  const lastKnownHash = lastKnown.commitHash;
  const lastKnownBaseHash = lastKnown.masterHash;
  const lastKnownDiffFiles = lastKnown.diffFiles;
  const lastKnownCommits = lastKnown.commitsNotInMaster;
  const lastKnownNumCommits = lastKnown.numCommitsNotInMaster;
  const lastKnownDiffStats = lastKnown.diffStats || {};
  const lastKnownWorkingDirDiffStats = lastKnown.workingDirDiffStats || {};
  const lastLogTime = lastKnown.lastLogTime || 0;

  // Determine if anything has changed
  const statusChanged = statusToStore !== lastKnownStatus || lastKnownStatus === undefined;
  const hashChanged = currentBranchHash !== lastKnownHash || lastKnownHash === undefined;
  const baseHashChanged = baseBranchHash !== lastKnownBaseHash || lastKnownBaseHash === undefined;
  const diffFilesChanged = JSON.stringify(diffFiles) !== JSON.stringify(lastKnownDiffFiles);
  const commitsChanged = JSON.stringify(commitsNotInBase) !== JSON.stringify(lastKnownCommits);
  const numCommitsChanged = numCommitsNotInBase !== lastKnownNumCommits;
  // Check if working directory stats have changed
  const workingDirChanged = JSON.stringify(workingDirDiffStats) !== JSON.stringify(lastKnownWorkingDirDiffStats);
  const diffStatsChanged = JSON.stringify(diffStats) !== JSON.stringify(lastKnownDiffStats);

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

  const shouldLogTime = somethingChanged && trackingIntervalPassed;

  // Always update the state if something changed, even if we don't log time
  if (somethingChanged) {
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
        entry => entry.date === today && entry.taskId === taskIdToLog
      );

      if (existingEntryIndex !== -1) {
        entries[existingEntryIndex].hours = parseFloat((entries[existingEntryIndex].hours + logIntervalHours).toFixed(4));
      } else {
        entries.push({ date: today, taskId: taskIdToLog, hours: logIntervalHours });
      }
      console.log(chalk.green(`Logged ${logIntervalHours.toFixed(2)} hours for ${chalk.cyan(taskIdToLog)} (repo: ${chalk.yellow(repoPath)}, branch: ${chalk.yellow(branchName)})`));
      return true;
    } else {
      console.log(chalk.yellow(`Changes detected in ${chalk.cyan(repoPath)} on branch ${chalk.cyan(branchName)}, but tracking interval (${config.trackingIntervalMinutes} minutes) has not passed since last log. No time logged.`));
      return false;
    }
  } else {
    console.log(chalk.gray(`No new changes in ${chalk.cyan(repoPath)} on branch ${chalk.cyan(branchName)}.`));
    return false;
  }
}
