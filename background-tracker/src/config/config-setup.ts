import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import inquirer from 'inquirer';
import path from 'path';
import { CONFIG_FILE_PATH } from '..';
import { branchExists, getAvailableBranches, discoverRepositories } from '../git/git-utils';
import { Config, RepositoryConfig } from './config-types';
import { logger } from '../shared/logger';

// Interactive configuration setup
export async function createConfigInteractively(): Promise<Config> {
    logger.info(`\nNo ${CONFIG_FILE_PATH} found. Let's set up your Git Activity Logger!\n`);

    // Ask how they want to track repositories
    let trackingModeAnswer;
    try {
        trackingModeAnswer = await inquirer.prompt([
        {
            type: 'list',
            name: 'mode',
            message: 'How would you like to track repositories?',
            choices: [
                { name: 'Auto-discover all repositories from a folder', value: 'auto-discover' },
                { name: 'Track a single repository', value: 'single' },
                { name: 'Track multiple repositories (manual setup)', value: 'multiple' }
            ]
        }
    ]);
    } catch (error: unknown) {
        const nodeError = error as Error;
        if (nodeError.message && nodeError.message.includes('force closed')) {
            throw new Error('Cannot run interactive setup in non-interactive mode. Please run this application in a terminal/console window.');
        }
        throw error;
    }

    const repositories: RepositoryConfig[] = [];
    let repositoriesFolder: string | undefined;

    if (trackingModeAnswer.mode === 'auto-discover') {
        // Auto-discovery flow - keep trying until we find repos or user chooses to do manual setup
        let foundRepos = false;
        while (!foundRepos) {
            const folderAnswer = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'path',
                    message: 'Where do you have your git repositories?',
                    default: 'C:\\git',
                    validate: (input: string) => {
                        if (!input.trim()) {
                            return 'Please enter a folder path.';
                        }
                        if (!existsSync(input)) {
                            return 'Directory does not exist. Please enter a valid path.';
                        }
                        return true;
                    }
                }
            ]);
            
            repositoriesFolder = folderAnswer.path.trim();
            
            try {
                const discoveredRepos = await discoverRepositories(repositoriesFolder as string);
                
                if (discoveredRepos.length === 0) {
                    logger.warn('No git repositories found in the specified folder.');
                    
                    const retryAnswer = await inquirer.prompt([
                        {
                            type: 'list',
                            name: 'action',
                            message: 'What would you like to do?',
                            choices: [
                                { name: 'Try a different folder', value: 'retry' },
                                { name: 'Set up repositories manually', value: 'manual' }
                            ]
                        }
                    ]);
                    
                    if (retryAnswer.action === 'manual') {
                        trackingModeAnswer.mode = 'single';
                        repositoriesFolder = undefined;
                        foundRepos = true; // Exit the loop
                    }
                    // If retry, continue the loop
                } else {
                    logger.info(`Found ${discoveredRepos.length} git repositories:`);
                    discoveredRepos.forEach(repo => {
                        logger.info(`  ${repo.path} (main branch: ${repo.mainBranch})`);
                    });
                    
                    const confirmAnswer = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'useDiscovered',
                            message: 'Use these discovered repositories?',
                            default: true
                        }
                    ]);
                    
                    if (confirmAnswer.useDiscovered) {
                        repositories.push(...discoveredRepos);
                        foundRepos = true; // Success - exit the loop
                    }
                    // If they don't want to use these repos, continue the loop to try again
                }
            } catch (error) {
                logger.error('Error discovering repositories: ' + String(error));
                
                const errorRetryAnswer = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'action',
                        message: 'What would you like to do?',
                        choices: [
                            { name: 'Try a different folder', value: 'retry' },
                            { name: 'Set up repositories manually', value: 'manual' }
                        ]
                    }
                ]);
                
                if (errorRetryAnswer.action === 'manual') {
                    trackingModeAnswer.mode = 'single';
                    repositoriesFolder = undefined;
                    foundRepos = true; // Exit the loop
                }
                // If retry, continue the loop
            }
        }
    }
    
    // Manual repository setup (single or multiple)
    if (trackingModeAnswer.mode === 'single' || trackingModeAnswer.mode === 'multiple') {
        let addingRepos = true;
        while (addingRepos) {
        logger.info(`\nRepository ${repositories.length + 1}:`);

        // First, get the repository path
        const pathAnswer = await inquirer.prompt([
            {
                type: 'input',
                name: 'path',
                message: 'Enter the full path to your Git repository:',
                default: 'K:\\git\\Dynaway.DFO.EAM',
                validate: (input: string) => {
                    if (!input.trim()) {
                        return 'Please enter a repository path.';
                    }
                    if (!existsSync(input)) {
                        return 'Directory does not exist. Please enter a valid path.';
                    }
                    if (!existsSync(path.join(input, '.git'))) {
                        return 'This directory is not a Git repository (no .git folder found).';
                    }
                    return true;
                }
            }
        ]);

        const repoPath = pathAnswer.path.trim();
        const availableBranches = await getAvailableBranches(repoPath);

        // Find common main branch candidates
        const commonMainBranches = availableBranches.filter(branch =>
            ['main', 'master', 'develop', 'development', 'dev'].includes(branch.toLowerCase())
        );

        // Then, get the main branch for this specific repository
        const branchAnswer = await inquirer.prompt([
            {
                type: 'input',
                name: 'mainBranch',
                message: 'What is the main branch name for this repository? (e.g., main, master, develop)',
                default: commonMainBranches[0] || 'master',
                validate: async (input: string) => {
                    if (!input.trim()) {
                        return 'Please enter a branch name.';
                    }

                    // Check if the branch exists in the repository

                    const doesBranchExist = await branchExists(repoPath, input.trim());
                    if (!doesBranchExist) {

                        if (availableBranches.length > 0) {
                            if (commonMainBranches.length > 0) {
                                return `Branch '${input.trim()}' does not exist. Common main branches found: ${commonMainBranches.join(', ')}`;
                            } else {
                                // Show first 10 branches if no common main branches found
                                const branchesToShow = availableBranches.slice(0, 10);
                                const moreMessage = availableBranches.length > 10 ? ` (and ${availableBranches.length - 10} more...)` : '';
                                return `Branch '${input.trim()}' does not exist. Available branches: ${branchesToShow.join(', ')}${moreMessage}`;
                            }
                        } else {
                            return `Branch '${input.trim()}' does not exist in the repository. Could not retrieve available branches.`;
                        }
                    }

                    return true;
                }
            }
        ]);

        const repoAnswers = {
            path: pathAnswer.path,
            mainBranch: branchAnswer.mainBranch
        };

        repositories.push({
            path: repoAnswers.path.trim(),
            mainBranch: repoAnswers.mainBranch.trim()
        });

        if (trackingModeAnswer.mode === 'single' || repositories.length >= 1) {
            if (trackingModeAnswer.mode === 'single') {
                addingRepos = false; // Only one repository for single mode
            } else {
                const continueAnswer = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'addAnother',
                        message: 'Would you like to add another repository?',
                        default: false
                    }
                ]);
                addingRepos = continueAnswer.addAnother;
            }
        }
        }
    }

    // Get other configuration options
    logger.info('\nConfiguration options:');
    const trackingInterval = await inquirer.prompt({
        type: 'number',
        name: 'value',
        message: 'How often should we check for changes? (minutes)',
        default: 15,
        validate: (input: number | undefined) => {
            if (input === undefined || input <= 0) {
                return 'Please enter a positive number.';
            }
            return true;
        }
    });
    const taskPattern = await inquirer.prompt({
        type: 'input',
        name: 'value',
        message: 'Task ID pattern (regex) to extract from branch names:',
        default: 'D[FM]O-\\d+',
        validate: (input: string) => {
            try {
                new RegExp(input);
                return true;
            } catch {
                return 'Please enter a valid regular expression.'
            }
        }
    });

    const taskTrackingUrl = await inquirer.prompt({
        type: 'input',
        name: 'value',
        message: 'Task tracking system base URL (optional, e.g., https://jira.eg.dk/browse/):',
        default: 'https://jira.eg.dk/browse/',
        validate: (input: string) => {
            if (!input.trim()) {
                return true; // Empty is allowed since it's optional
            }
            try {
                new URL(input);
                return true;
            } catch {
                return 'Please enter a valid URL or leave empty.';
            }
        }
    });    const config: Config = {
        ...(repositoriesFolder ? { repositoriesFolder } : { repositories }),
        trackingIntervalMinutes: trackingInterval.value,
        taskIdRegEx: taskPattern.value,
        taskTrackingUrl: taskTrackingUrl.value.trim() || undefined
    };

    // Save the config
    try {
        await writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
        logger.success(`\nConfiguration saved to ${CONFIG_FILE_PATH}`);
        logger.info('You can edit this file later to make changes.');
    } catch (error) {
        logger.error('Error saving configuration: ' + String(error));
        throw error;
    }

    return config;
}