import { execa } from 'execa';
import { readFile, writeFile } from 'fs/promises';
import { Config } from './config.types';
import { RepoState } from './repoState.types';
import chalk from 'chalk';

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

function extractTaskId(branchName: string, pattern?: string): string | null {
  // Default pattern is DFO-\d+, but can be customized through config
  const taskPattern = pattern || 'DFO-\\d+';
  const regex = new RegExp(taskPattern, 'i');
  const match = branchName.match(regex);
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

async function getFileDiffStats(repoPath: string, base: string, branch: string): Promise<Record<string, { added: number; deleted: number }> | null> {
  if (!(await branchExists(repoPath, base)) || !(await branchExists(repoPath, branch))) return null;
  try {
    const { stdout } = await execa('git', ['diff', '--numstat', `${base}...${branch}`], { cwd: repoPath });
    if (!stdout.trim()) return {};
    
    const diffStats: Record<string, { added: number; deleted: number }> = {};
    
    // Parse the numstat output
    // Format is: <added lines>\t<deleted lines>\t<file path>
    stdout.trim().split('\n').forEach(line => {
      const [added, deleted, filePath] = line.split('\t');
      
      // Handle binary files which have "-" instead of numbers
      const addedNum = added === '-' ? 0 : parseInt(added, 10);
      const deletedNum = deleted === '-' ? 0 : parseInt(deleted, 10);
      
      diffStats[filePath] = {
        added: addedNum,
        deleted: deletedNum
      };
    });
    
    return diffStats;
  } catch (error) {
    console.error(`Error getting file diff stats between ${base} and ${branch} in ${repoPath}:`, error);
    return null;
  }
}

// Get diff stats for files changed in the working directory (not yet committed)
async function getWorkingDirDiffStats(repoPath: string): Promise<Record<string, { added: number; deleted: number }> | null> {
  try {
    const { stdout } = await execa('git', ['diff', '--numstat'], { cwd: repoPath });
    if (!stdout.trim()) return {};
    
    const diffStats: Record<string, { added: number; deleted: number }> = {};
    
    // Parse the numstat output
    stdout.trim().split('\n').forEach(line => {
      if (!line.trim()) return; // Skip empty lines
      
      const [added, deleted, filePath] = line.split('\t');
      
      // Handle binary files which have "-" instead of numbers
      const addedNum = added === '-' ? 0 : parseInt(added, 10);
      const deletedNum = deleted === '-' ? 0 : parseInt(deleted, 10);
      
      diffStats[filePath] = {
        added: addedNum,
        deleted: deletedNum
      };
    });
    
    // Also check staged changes
    const { stdout: stagedStdout } = await execa('git', ['diff', '--cached', '--numstat'], { cwd: repoPath });
    
    if (stagedStdout.trim()) {
      stagedStdout.trim().split('\n').forEach(line => {
        if (!line.trim()) return; // Skip empty lines
        
        const [added, deleted, filePath] = line.split('\t');
        
        // Handle binary files which have "-" instead of numbers
        const addedNum = added === '-' ? 0 : parseInt(added, 10);
        const deletedNum = deleted === '-' ? 0 : parseInt(deleted, 10);
        
        // Add to existing stats or create new entry
        if (diffStats[filePath]) {
          diffStats[filePath].added += addedNum;
          diffStats[filePath].deleted += deletedNum;
        } else {
          diffStats[filePath] = {
            added: addedNum,
            deleted: deletedNum
          };
        }
      });
    }
    
    return diffStats;
  } catch (error) {
    console.error(`Error getting working directory diff stats in ${repoPath}:`, error);
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
  const workingDirDiffStats = await getWorkingDirDiffStats(repoPath);
  const diffStats = await getFileDiffStats(repoPath, baseBranch, branchName);
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
    // Check if time interval has passed to avoid duplicate logging
  const now = Date.now();
  const timeSinceLastLog = now - lastLogTime;
  const minimumLogIntervalMs = config.logSummaryIntervalMinutes * 60 * 1000;
  const timeIntervalPassed = timeSinceLastLog >= minimumLogIntervalMs;
  
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

  // Only log time if something changed AND enough time has passed since the last log
  const shouldLogTime = somethingChanged && timeIntervalPassed;

  // Always update the state if something changed, even if we don't log time
  if (somethingChanged) {
    console.log(`Detected changes in ${repoPath} on branch ${branchName}.${shouldLogTime ? ' Logging time' : ' Not logging time (time interval not passed)'} and updating repo state.`);    // Update repo state with all details
    repoState[repoPath][branchName] = {
      status: statusToStore,
      commitHash: currentBranchHash,
      masterHash: baseBranchHash, // keep property name for compatibility
      diffFiles: diffFiles,
      commitsNotInMaster: commitsNotInBase, // keep property name for compatibility
      numCommitsNotInMaster: numCommitsNotInBase,      diffStats: diffStats,
      workingDirDiffStats: workingDirDiffStats,
      lastLogTime: shouldLogTime ? now : lastLogTime // Only update the time if we're logging
    };    const extractedTaskId = extractTaskId(branchName, config.taskIdPattern);
    const taskIdToLog = extractedTaskId || "NonTaskActivity";
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logIntervalHours = config.logSummaryIntervalMinutes / 60;

    // Only log time if the time interval has passed
    if (shouldLogTime) {
      const existingEntryIndex = entries.findIndex(
        entry => entry.date === today && entry.taskId === taskIdToLog
      );

      if (existingEntryIndex !== -1) {
        entries[existingEntryIndex].hours = parseFloat((entries[existingEntryIndex].hours + logIntervalHours).toFixed(4));      } else {
        entries.push({ date: today, taskId: taskIdToLog, hours: logIntervalHours });
      }
      console.log(chalk.green(`Logged ${logIntervalHours.toFixed(2)} hours for ${chalk.cyan(taskIdToLog)} (repo: ${chalk.yellow(repoPath)}, branch: ${chalk.yellow(branchName)})`));      return true;
    } else {
      console.log(chalk.yellow(`Changes detected in ${chalk.cyan(repoPath)} on branch ${chalk.cyan(branchName)}, but time interval (${config.logSummaryIntervalMinutes} minutes) has not passed since last log. No time logged.`));
      return false;
    }  } else {
    console.log(chalk.gray(`No new changes in ${chalk.cyan(repoPath)} on branch ${chalk.cyan(branchName)}. No time logged.`));
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
    // If any time was logged, write back the log entries
  if (anyActivityLogged) {
    await writeLogFile(config.logFilePath, entries);
    console.log(`Updated time log at ${config.logFilePath}`);
  }
}

// Import and read config
async function loadConfig(): Promise<Config> {
  try {
    const configData = await readFile('./config.json', 'utf-8');
    const config = JSON.parse(configData) as Config;
    
    // Validate config
    if (!config.repositories || !Array.isArray(config.repositories)) {
      throw new Error('Config is missing repositories array');
    }
      if (!config.logFilePath) {
      config.logFilePath = './branch_activity_log.csv';
      console.log('Using default log file path: ./branch_activity_log.csv');
    }
    
    if (!config.logSummaryIntervalMinutes || config.logSummaryIntervalMinutes <= 0) {
      config.logSummaryIntervalMinutes = 30;
      console.log('Using default log summary interval: 30 minutes');
    }
      if (!config.trackingIntervalMinutes || config.trackingIntervalMinutes <= 0) {
      config.trackingIntervalMinutes = 5;
      console.log('Using default tracking interval: 5 minutes');
    }
    
    if (!config.taskIdPattern) {
      config.taskIdPattern = 'DFO-\\d+';
      console.log('Using default task ID pattern: DFO-\\d+');
    }
    
    return config;
  } catch (error: any) {
    console.error('Error loading config:', error.message);
    process.exit(1);
  }
}

// Main entry point
async function main() {
  try {
    console.log(chalk.cyan.bold('Git Activity Logger starting...'));
    const config = await loadConfig();    console.log(chalk.green(`Loaded config with ${chalk.white.bold(config.repositories.length)} repositories`));
    
    // Set up intervals
    const logSummaryIntervalMinutes = config.logSummaryIntervalMinutes;
    const trackingIntervalMinutes = config.trackingIntervalMinutes;
    
    console.log(chalk.blue.bold(`Running with the following intervals:`));
    console.log(chalk.yellow(`- Tracking interval: ${chalk.white(trackingIntervalMinutes.toString())} minutes (how often we check for changes)`));
    console.log(chalk.yellow(`- Log summary interval: ${chalk.white(logSummaryIntervalMinutes.toString())} minutes (how often we log time and display daily summary)`));
    
    // Variables to track the last summary time
    let lastSummaryTime = 0;
      // Function to display today's summary
    async function displayTodaySummary() {
      const now = Date.now();
      // Only display summary if enough time has passed
      if (now - lastSummaryTime < logSummaryIntervalMinutes * 60 * 1000) {
        return;
      }
      
      const entries = await readLogFile(config.logFilePath);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        // Filter entries for today
      const todayEntries = entries.filter(entry => entry.date === today);
      
      if (todayEntries.length === 0) {
        console.log(chalk.blue(`\n[${new Date().toISOString()}] Today's Summary: ${chalk.yellow('No time logged yet today.')}`));
        lastSummaryTime = now;
        return;
      }
      
      // Group by task ID and sum hours
      const taskSummary: Record<string, number> = {};
      let totalHours = 0;
      
      todayEntries.forEach(entry => {
        taskSummary[entry.taskId] = (taskSummary[entry.taskId] || 0) + entry.hours;
        totalHours += entry.hours;
      });
      
      // Display summary
      console.log(chalk.blue.bold(`\n[${new Date().toISOString()}] Today's Summary:`));
      console.log(chalk.green(`Total hours logged today: ${chalk.white.bold(totalHours.toFixed(2))}`));
      console.log(chalk.blue('Breakdown by task:'));
      
      Object.entries(taskSummary).forEach(([taskId, hours]) => {
        console.log(`- ${chalk.cyan(taskId)}: ${chalk.yellow(hours.toFixed(2))} hours`);
      });
      
      lastSummaryTime = now;
    }
      // Run once immediately
    await processAllRepositories(config);
    await displayTodaySummary();
    
    // Set up interval for tracking changes
    const intervalMs = trackingIntervalMinutes * 60 * 1000;
    setInterval(async () => {
      try {
        console.log(chalk.magenta(`\n[${new Date().toISOString()}] Running scheduled check...`));
        await processAllRepositories(config);
        await displayTodaySummary();
      } catch (error) {
        console.error('Error in scheduled execution:', error);
        // Don't exit on errors in continuous mode
      }
    }, intervalMs);
    
    console.log(chalk.green.bold('Git Activity Logger running in continuous mode. Press Ctrl+C to exit.'));
  } catch (error) {
    console.error('Error in main execution:', error);
    process.exit(1);
  }
}

// Execute the main function
main().catch(error => {
  console.error('Unhandled error in main execution:', error);
  process.exit(1);
});