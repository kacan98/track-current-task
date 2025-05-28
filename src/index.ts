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

// Takes mutable entries and repoState, modifies them directly.
// Returns true if time was logged, false otherwise
async function updateLogForRepository(
  repoPath: string,
  config: Config,
  entries: LogEntry[], // Mutable: Log entries are added/updated here
  repoState: RepoState // Mutable: Repo state is updated here
): Promise<boolean> {
  const branchName = await getCurrentBranch(repoPath);
  if (!branchName) {
    console.log(`Could not determine current branch for ${repoPath}. Skipping activity check for this repository.`);
    // Note: No specific branch state to update if branchName is null.
    // If repoPath itself becomes invalid, that state might be handled differently if needed.
    return false;
  }

  const currentGitStatus = await getGitStatus(repoPath);
  // Use a special marker for null status (e.g., if git commands fail for the directory)
  const statusToStore = currentGitStatus === null ? "<<ERROR_GIT_STATUS_FAILED>>" : currentGitStatus;

  // Ensure repoPath and branchName path exists in state
  if (!repoState[repoPath]) {
    repoState[repoPath] = {};
  }
  const lastKnownStatus = repoState[repoPath][branchName];

  // Log time if status changed or if it's the first time seeing this branch
  if (statusToStore !== lastKnownStatus || lastKnownStatus === undefined) {
    console.log(`Activity detected in ${repoPath} on branch ${branchName}. Logging time.`);
    repoState[repoPath][branchName] = statusToStore;

    const extractedTaskId = extractTaskId(branchName);
    const taskIdToLog = extractedTaskId || "NonTaskActivity";
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logIntervalHours = config.logIntervalMinutes / 60;

    const existingEntryIndex = entries.findIndex(
      entry => entry.date === today && entry.taskId === taskIdToLog
    );

    if (existingEntryIndex !== -1) {
      // Ensure hours are summed correctly, handling potential floating point issues
      entries[existingEntryIndex].hours = parseFloat((entries[existingEntryIndex].hours + logIntervalHours).toFixed(4));
    } else {
      entries.push({ date: today, taskId: taskIdToLog, hours: logIntervalHours });
    }
    console.log(`Logged ${logIntervalHours.toFixed(2)} hours for ${taskIdToLog} (repo: ${repoPath}, branch: ${branchName})`);
    return true; // Time was logged
  } else {
    console.log(`No new activity in ${repoPath} on branch ${branchName}. No time logged.`);
    // It's important to still update the state if, for example, an error state is now resolved,
    // or if the status was undefined and is now known, even if it matches (though the undefined check covers this).
    // The primary case here is if lastKnownStatus was some actual status, and statusToStore is the same.
    // If statusToStore is different from repoState[repoPath][branchName] (e.g. error resolved but no "activity" per se)
    // it's already handled by the main "if" block. This "else" means statusToStore === lastKnownStatus.
    // So, no state update is strictly needed here unless lastKnownStatus was undefined (covered by main "if").
    return false; // No time logged
  }
}

async function processAllRepositories(config: Config): Promise<void> {
  let entries = await readLogFile(config.logFilePath); // Load existing log entries
  const repoState = await readRepoState(); // Load current repository states

  let anyActivityLogged = false;

  for (const repoPath of config.repositoryPaths) {
    // updateLogForRepository will modify 'entries' and 'repoState' directly
    const loggedTimeForRepo = await updateLogForRepository(repoPath, config, entries, repoState);
    if (loggedTimeForRepo) {
      anyActivityLogged = true;
    }
  }

  // Always write back the repoState, as it might have changed (new branches, status updates, error states)
  await writeRepoState(repoState);

  // Only write the log file if new activity was actually logged
  // This prevents rewriting the same log file if no activity occurred across all repos.
  // However, if an existing entry was updated, we should write.
  // The 'entries' array is modified in place, so it contains all current data.
  // The decision to write should be based on whether 'entries' has actually changed.
  // For simplicity now: if anyActivityLogged is true, we write.
  // A more robust check would be to compare initial entries with final entries, or if repoState changed.
  // Given that entries are added/updated in place, if anyActivityLogged is true, it means 'entries' has changed.
  if (anyActivityLogged) {
    await writeLogFile(config.logFilePath, entries);
    console.log("Log file updated.");
  } else {
    console.log("No new activity across all repositories. Log file not rewritten.");
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

  if (!config.repositoryPaths || config.repositoryPaths.length === 0) {
    console.error('No repository paths configured in config.json. Exiting.');
    process.exit(1);
  }

  console.log(`Starting activity logger for repositories: ${config.repositoryPaths.join(', ')}`);
  console.log(`Logging interval: ${config.logIntervalMinutes} minutes.`);
  console.log(`Log file: ${config.logFilePath}`);

  await processAllRepositories(config);

  setInterval(async () => {
    await processAllRepositories(config);
  }, config.logIntervalMinutes * 60 * 1000);
}


main();
