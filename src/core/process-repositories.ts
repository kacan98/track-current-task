import { ACTIVITY_LOG_FILE_PATH } from '..';
import { Config } from '../config/config-types';
import { getLogEntries, getRepoState, writeLogFile, writeRepoState } from './file-operations';
import { updateLogForRepository } from './update-log-for-repository';

export async function processAllRepositories(config: Config): Promise<void> {
  let existingEntries = await getLogEntries();
  const currentRepoState = await getRepoState();

  let anyActivityLogged = false;

  const repositories = config.repositories || [];
  
  for (const repo of repositories) {
    anyActivityLogged = await updateLogForRepository(repo.path, config, existingEntries, currentRepoState, repo.mainBranch);
  }

  // Always write back the repoState, as it might have changed (new branches, status updates, error states)
  await writeRepoState(currentRepoState);

  // If any time was logged, write back the log entries
  if (anyActivityLogged) {
    await writeLogFile(ACTIVITY_LOG_FILE_PATH, existingEntries);
    console.log(`Time log updated in ${ACTIVITY_LOG_FILE_PATH}`);
  }
}


