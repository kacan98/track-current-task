import { ACTIVITY_LOG_FILE_PATH } from '..';
import { Config } from '../config/config-types';
import { getLogEntries, getRepoState, writeLogFile, writeRepoState } from './file-operations';
import { updateLogForRepository } from './update-log-for-repository';

export async function processAllRepositories(config: Config): Promise<void> {
  let entries = await getLogEntries(); // Load existing log entries
  // Make a deep copy of the initial entries for later comparison
  const initialEntries = JSON.stringify(entries);
  const repoState = await getRepoState(); // Load current repository states

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
    await writeLogFile(ACTIVITY_LOG_FILE_PATH, entries);
    console.log(`Updated time log at ${ACTIVITY_LOG_FILE_PATH}`);
  }
}


