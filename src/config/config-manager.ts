import chalk from 'chalk';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import inquirer from 'inquirer';
import path from 'path';
import { CONFIG_FILE_PATH } from '..';
import { branchExists, getAvailableBranches } from '../git/git-utils';
import { Config } from './config-types';
import { createConfigInteractively } from './create-config-interactively';

// Import and read config
export async function loadConfig(): Promise<Config> {
  try {
    // Check if config.json exists
    if (!existsSync(CONFIG_FILE_PATH)) {
      return await createConfigInteractively();
    }

    const configData = await readFile(CONFIG_FILE_PATH, 'utf-8');
    const config = JSON.parse(configData) as Config;

    // Validate config
    if (!config.repositories || !Array.isArray(config.repositories)) {
      throw new Error('Config is missing repositories array');
    }

    // Validate each repository and its main branch
    for (const repo of config.repositories) {
      if (!repo.path) {
        throw new Error('Repository configuration is missing path');
      }

      if (!existsSync(repo.path)) {
        throw new Error(`Repository path does not exist: ${repo.path}`);
      }

      if (!existsSync(path.join(repo.path, '.git'))) {
        throw new Error(`Directory is not a Git repository (no .git folder found): ${repo.path}`);
      }

      if (repo.mainBranch) {
        const doesBranchExist = await branchExists(repo.path, repo.mainBranch);
        if (!doesBranchExist) {
          const availableBranches = await getAvailableBranches(repo.path);
          let branchList = '';
          if (availableBranches.length > 0) {
            // Find common main branch candidates
            const commonMainBranches = availableBranches.filter(branch =>
              ['main', 'master', 'develop', 'development', 'dev'].includes(branch.toLowerCase())
            );

            if (commonMainBranches.length > 0) {
              branchList = ` Common main branches: ${commonMainBranches.join(', ')}`;
            } else {
              // Show first 5 branches if no common main branches found
              const branchesToShow = availableBranches.slice(0, 5);
              const moreMessage = availableBranches.length > 5 ? ` (and ${availableBranches.length - 5} more...)` : '';
              branchList = ` Available branches: ${branchesToShow.join(', ')}${moreMessage}`;
            }
          }
          console.warn(chalk.yellow(`⚠️  Warning: Main branch '${repo.mainBranch}' does not exist in repository ${repo.path}.${branchList}`));
          console.warn(chalk.yellow('   The application will fall back to default branch detection.'));
        }
      }
    }

    if (!config.trackingIntervalMinutes || config.trackingIntervalMinutes <= 0) {
      config.trackingIntervalMinutes = 5;
      console.log('Using default tracking interval: 5 minutes');
    }
    if (!config.taskIdRegEx) {
      config.taskIdRegEx = 'DFO-\\d+';
      console.log('Using default task ID pattern: DFO-\\d+');
    }

    return config;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // This shouldn't happen since we check existsSync above, but just in case
      console.log(chalk.yellow('Config file not found. Starting interactive setup...'));
      return await createConfigInteractively();
    }

    console.error('Error loading config:', error.message);
    console.log(chalk.yellow('\nWould you like to create a new configuration? Your existing config.json may be corrupted.'));

    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'createNew',
        message: 'Create a new configuration?',
        default: true
      }
    ]);

    if (answer.createNew) {
      return await createConfigInteractively();
    } else {
      process.exit(1);
    }
  }
}
