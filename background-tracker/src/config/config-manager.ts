import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import inquirer from 'inquirer';
import path from 'path';
import { CONFIG_FILE_PATH } from '..';
import { branchExists, discoverRepositories } from '../git/git-utils';
import { Config, ConfigSchema } from './config-types';
import { createConfigInteractively } from './config-setup';
import { logger } from '../shared/logger';

async function handleAutoDiscovery(config: Config): Promise<void> {
  if (!config.repositoriesFolder) return;
  
  try {
    const previousRepos = config.repositories || [];
    config.repositories = await discoverRepositories(config.repositoriesFolder);
    
    const prevPaths = new Set(previousRepos.map(r => r.path));
    const newPaths = new Set(config.repositories.map(r => r.path));
    
    const newRepos = config.repositories.filter(r => !prevPaths.has(r.path));
    const removedRepos = previousRepos.filter(r => !newPaths.has(r.path));
    
    if (newRepos.length > 0) {
      logger.info(`Found ${newRepos.length} new repositories`);
    }
    if (removedRepos.length > 0) {
      logger.warn(`${removedRepos.length} repositories removed`);
    }
  } catch (error) {
    throw new Error(`Failed to discover repositories: ${error}`);
  }
}

async function validateRepositoryPaths(config: Config): Promise<void> {
  if (!config.repositories) return;
  
  for (const repo of config.repositories) {
    if (!existsSync(repo.path)) {
      throw new Error(`Repository path does not exist: ${repo.path}`);
    }
    if (!existsSync(path.join(repo.path, '.git'))) {
      throw new Error(`Not a Git repository: ${repo.path}`);
    }
    
    // Warn about missing branches but don't fail
    if (repo.mainBranch && !await branchExists(repo.path, repo.mainBranch)) {
      logger.warn(`Branch '${repo.mainBranch}' not found in ${repo.path}`);
    }
  }
}

// Import and read config
export async function loadConfig(): Promise<Config> {
  try {
    if (!existsSync(CONFIG_FILE_PATH)) {
      return await createConfigInteractively();
    }

    const configData = await readFile(CONFIG_FILE_PATH, 'utf-8');
    const rawConfig = JSON.parse(configData);
    
    // Parse with Zod - this handles validation and defaults
    const config = ConfigSchema.parse(rawConfig);
    
    // Handle auto-discovery if configured
    await handleAutoDiscovery(config);
    
    // Additional filesystem validation
    await validateRepositoryPaths(config);

    return config;
  } catch (error: unknown) {
    // Handle errors  
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      logger.warn('Config file not found. Starting interactive setup...');
      return await createConfigInteractively();
    }
    
    if (nodeError instanceof Error && nodeError.message?.includes('force closed')) {
      throw new Error('Cannot run interactive setup in non-interactive mode.');
    }
    
    logger.error('Error loading config: ' + (nodeError instanceof Error ? nodeError.message : String(nodeError)));
    logger.warn('\nWould you like to create a new configuration?');
    
    try {
      const { createNew } = await inquirer.prompt([{
        type: 'confirm',
        name: 'createNew',
        message: 'Create a new configuration?',
        default: true
      }]);
      
      if (createNew) {
        return await createConfigInteractively();
      }
      throw new Error('Configuration setup cancelled');
    } catch (promptError: unknown) {
      const nodePromptError = promptError as Error;
      if (nodePromptError.message?.includes('force closed')) {
        throw new Error('Cannot run interactive setup in non-interactive mode.');
      }
      throw promptError;
    }
  }
}