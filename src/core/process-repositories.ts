import { ACTIVITY_LOG_FILE_PATH } from '..';
import { Config } from '../config/config-types';
import { getLogEntries, getRepoState, writeLogFile, writeRepoState } from './file-operations';
import { updateLogForRepository } from './update-log-for-repository';

export async function processAllRepositories(config: Config): Promise<void> {
  let existingEntries = await getLogEntries();
  const currentRepoState = await getRepoState();

  const repositories = config.repositories || [];
  
  console.log(`Checking ${repositories.length} repositories...`);
  
  // Process all repositories in parallel with progress tracking
  let completed = 0;
  const results = await Promise.all(
    repositories.map(async (repo, index) => {
      const result = await updateLogForRepository(repo, config, existingEntries, currentRepoState);
      completed++;
      if (completed % 5 === 0 || completed === repositories.length) {
        console.log(`Progress: ${completed}/${repositories.length} repositories checked`);
      }
      return result;
    })
  );
  
  // Check if any repository logged time
  const anyActivityLogged = results.some(result => result === true);

  // Always write back the repoState, as it might have changed (new branches, status updates, error states)
  await writeRepoState(currentRepoState);

  // If any time was logged, write back the log entries
  if (anyActivityLogged) {
    await writeLogFile(ACTIVITY_LOG_FILE_PATH, existingEntries);
    console.log(`Time log updated in ${ACTIVITY_LOG_FILE_PATH}`);
  }
}


