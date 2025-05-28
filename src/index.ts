import { execa } from 'execa';
import { readFile, writeFile } from 'fs/promises';
import { Config } from './config.types';
import { RepoState } from './repoState.types';

async function getCurrentBranch(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoPath });
    return stdout.trim();
  } catch (error) {
    console.error(`Error getting current branch in ${repoPath}:`, error);
    return null;
  }
}

async function getGitStatus(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await execa('git', ['status', '--porcelain'], { cwd: repoPath });
    return stdout.trim();
  } catch (error) {
    console.error(`Error getting git status in ${repoPath}:`, error);
    return null;
  }
}

function extractTaskId(branchName: string): string | null {
  const match = branchName.match(/DFO-\d+/i);
  return match ? match[0].toUpperCase() : null;
}

export interface LogEntry {
  date: string; // YYYY-MM-DD
  taskId: string;
  hours: number;
}

async function readLogFile(filePath: string): Promise<LogEntry[]> {
  try {
    const data = await readFile(filePath, 'utf-8');
    const lines = data.trim().split('\n');
    if (lines.length <= 1) {
      return []; // Empty or only header
    }
    // Skip header row, parse the rest
    return lines.slice(1).map(line => {
      const [date, taskId, hoursStr] = line.split(',');
      return { date, taskId, hours: parseFloat(hoursStr) };
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return []; // File not found, return empty array
    }
    console.error(`Error reading log file ${filePath}:`, error);
    return [];
  }
}

async function writeLogFile(filePath: string, entries: LogEntry[]): Promise<void> {
  try {
    const header = 'date,taskId,hours';
    const csvLines = entries.map(entry => `${entry.date},${entry.taskId},${entry.hours}`);
    const csvContent = [header, ...csvLines].join('\n');
    await writeFile(filePath, csvContent, 'utf-8');
  } catch (error) {
    console.error(`Error writing log file ${filePath}:`, error);
  }
}

const REPO_STATE_FILE_PATH = './repo_activity_state.json';

async function readRepoState(filePath: string = REPO_STATE_FILE_PATH): Promise<RepoState> {
  try {
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data) as RepoState;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {}; // File not found, return empty state
    }
    console.error(`Error reading repo state file ${filePath}:`, error);
    return {};
  }
}

async function writeRepoState(state: RepoState, filePath: string = REPO_STATE_FILE_PATH): Promise<void> {
  try {
    await writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing repo state file ${filePath}:`, error);
  }
}

async function branchExists(repoPath: string, branch: string): Promise<boolean> {
  try {
    await execa('git', ['rev-parse', '--verify', branch], { cwd: repoPath });
    return true;
  } catch {
    return false;
  }
}

async function getDefaultBaseBranch(repoPath: string, configuredMainBranch?: string): Promise<string> {
  // First, use configured main branch if provided
  if (configuredMainBranch) {
    if (await branchExists(repoPath, configuredMainBranch)) {
      return configuredMainBranch;
    }
    console.warn(`Configured main branch '${configuredMainBranch}' does not exist in ${repoPath}, falling back to defaults.`);
  }
  
  // Otherwise try master, then main
  if (await branchExists(repoPath, 'master')) return 'master';
  if (await branchExists(repoPath, 'main')) return 'main';
  return 'master'; // fallback, but will likely error if neither exists
}

async function getLatestCommitHash(repoPath: string, branch: string): Promise<string | null> {
  if (!(await branchExists(repoPath, branch))) return null;
  try {
    const { stdout } = await execa('git', ['rev-parse', branch], { cwd: repoPath });
    return stdout.trim();
  } catch (error) {
    console.error(`Error getting latest commit hash for ${branch} in ${repoPath}:`, error);
    return null;
  }
}

async function getDiffFilesWithBase(repoPath: string, base: string, branch: string): Promise<string[] | null> {
  if (!(await branchExists(repoPath, base)) || !(await branchExists(repoPath, branch))) return null;
  try {
    const { stdout } = await execa('git', ['diff', '--name-only', `${base}...${branch}`], { cwd: repoPath });
    return stdout.trim() ? stdout.trim().split('\n') : [];
  } catch (error) {
    console.error(`Error getting diff files between ${base} and ${branch} in ${repoPath}:`, error);
    return null;
  }
}

async function getCommitsNotInBase(repoPath: string, base: string, branch: string): Promise<string[] | null> {
  if (!(await branchExists(repoPath, base)) || !(await branchExists(repoPath, branch))) return null;
  try {
    const { stdout } = await execa('git', ['log', '--pretty=%H', `${base}..${branch}`], { cwd: repoPath });
    return stdout.trim() ? stdout.trim().split('\n') : [];
  } catch (error) {
    console.error(`Error getting commits not in ${base} for ${branch} in ${repoPath}:`, error);
    return null;
  }
}

// Takes mutable entries and repoState, modifies them directly.
// Returns true if time was logged, false otherwise
async function updateLogForRepository(
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

  // Ensure repoPath and branchName path exists in state
  if (!repoState[repoPath]) {
    repoState[repoPath] = {};
  }
  const lastKnown = repoState[repoPath][branchName] || {};
  const lastKnownStatus = lastKnown.status;
  const lastKnownHash = lastKnown.commitHash;
  const lastKnownBaseHash = lastKnown.masterHash; // keep property name for compatibility
  const lastKnownDiffFiles = lastKnown.diffFiles;
  const lastKnownCommits = lastKnown.commitsNotInMaster;
  const lastKnownNumCommits = lastKnown.numCommitsNotInMaster;

  // Determine if anything has changed
  const statusChanged = statusToStore !== lastKnownStatus || lastKnownStatus === undefined;
  const hashChanged = currentBranchHash !== lastKnownHash || lastKnownHash === undefined;
  const baseHashChanged = baseBranchHash !== lastKnownBaseHash || lastKnownBaseHash === undefined;
  const diffFilesChanged = JSON.stringify(diffFiles) !== JSON.stringify(lastKnownDiffFiles);
  const commitsChanged = JSON.stringify(commitsNotInBase) !== JSON.stringify(lastKnownCommits);
  const numCommitsChanged = numCommitsNotInBase !== lastKnownNumCommits;

  const somethingChanged = statusChanged || hashChanged || baseHashChanged || diffFilesChanged || commitsChanged || numCommitsChanged;

  if (somethingChanged) {
    console.log(`Detected changes in ${repoPath} on branch ${branchName}. Logging time and updating repo state.`);
    // Update repo state with all details
    repoState[repoPath][branchName] = {
      status: statusToStore,
      commitHash: currentBranchHash,
      masterHash: baseBranchHash, // keep property name for compatibility
      diffFiles: diffFiles,
      commitsNotInMaster: commitsNotInBase, // keep property name for compatibility
      numCommitsNotInMaster: numCommitsNotInBase
    };

    const extractedTaskId = extractTaskId(branchName);
    const taskIdToLog = extractedTaskId || "NonTaskActivity";
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logIntervalHours = config.logIntervalMinutes / 60;

    const existingEntryIndex = entries.findIndex(
      entry => entry.date === today && entry.taskId === taskIdToLog
    );

    if (existingEntryIndex !== -1) {
      entries[existingEntryIndex].hours = parseFloat((entries[existingEntryIndex].hours + logIntervalHours).toFixed(4));
    } else {
      entries.push({ date: today, taskId: taskIdToLog, hours: logIntervalHours });
    }
    console.log(`Logged ${logIntervalHours.toFixed(2)} hours for ${taskIdToLog} (repo: ${repoPath}, branch: ${branchName})`);
    return true;
  } else {
    console.log(`No new changes in ${repoPath} on branch ${branchName}. No time logged.`);
    return false;
  }
}

async function processAllRepositories(config: Config): Promise<void> {
  let entries = await readLogFile(config.logFilePath); // Load existing log entries
  // Make a deep copy of the initial entries for later comparison
  const initialEntries = JSON.stringify(entries);
  const repoState = await readRepoState(); // Load current repository states

  let anyActivityLogged = false;

  // Process repositories from new config format
  const repositories = config.repositories || [];
  
  // Process repository objects with path and mainBranch
  for (const repo of repositories) {
    const loggedTimeForRepo = await updateLogForRepository(repo.path, config, entries, repoState, repo.mainBranch);
    if (loggedTimeForRepo) {
      anyActivityLogged = true;
    }
  }

  // Always write back the repoState, as it might have changed (new branches, status updates, error states)
  await writeRepoState(repoState);

  // Compare initial and final entries to detect any changes (additions, removals, or modifications)
  const finalEntries = JSON.stringify(entries);
  const entriesChanged = initialEntries !== finalEntries;

  // Only write the log file if entries have changed
  if (entriesChanged) {
    await writeLogFile(config.logFilePath, entries);
    console.log("Log file updated.");
  } else {
    console.log("No changes to log entries. Log file not rewritten.");
  }
}

async function main(): Promise<void> {
  const configPath = './config.json';
  let config: Config;

  try {
    const configFile = await readFile(configPath, 'utf-8');
    config = JSON.parse(configFile) as Config;
  } catch (error) {
    console.error(`Error reading or parsing ${configPath}:`, error);
    process.exit(1);
  }

  // Check for repositories in new format or fallback to backward compatibility
  const hasRepositories = config.repositories && config.repositories.length > 0;

  if (!hasRepositories) {
    throw new Error('No repositories configured in config.json. Exiting.');
  }

  const repos = config.repositories.map(r => r.path);

  console.log(`Starting activity logger for repositories: ${repos.join(', ')}`);
  console.log(`Logging interval: ${config.logIntervalMinutes} minutes.`);
  console.log(`Log file: ${config.logFilePath}`);

  await processAllRepositories(config);

  setInterval(async () => {
    await processAllRepositories(config);
  }, config.logIntervalMinutes * 60 * 1000);
}


main();
