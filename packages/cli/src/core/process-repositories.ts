import { ACTIVITY_LOG_FILE_PATH } from '..';
import { Config } from '../config/config-types';
import { getLogEntries, getRepoState, writeLogFile, writeRepoState } from './file-operations';
import { updateLogForRepository } from './update-log-for-repository';
import { logger } from '@shared/logger';

export async function processAllRepositories(config: Config): Promise<void> {
  const existingEntries = await getLogEntries();
  const currentRepoState = await getRepoState();

  const repositories = config.repositories || [];
  
  logger.info(`Checking ${repositories.length} repositories...`);
  
  // Process all repositories in parallel with progress tracking
  let completed = 0;
  const results = await Promise.all(
    repositories.map(async (repo, _index) => {
      const result = await updateLogForRepository(repo, config, existingEntries, currentRepoState);
      completed++;
      if (completed % 5 === 0 || completed === repositories.length) {
        logger.info(`Progress: ${completed}/${repositories.length} repositories checked`);
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
    logger.success(`Time log updated in ${ACTIVITY_LOG_FILE_PATH}`);
  }
}


