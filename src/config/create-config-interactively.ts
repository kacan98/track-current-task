import chalk from 'chalk';
import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import inquirer from 'inquirer';
import path from 'path';
import { CONFIG_FILE_PATH } from '..';
import { branchExists, getAvailableBranches } from '../git/git-utils';
import { Config, RepositoryConfig } from './config-types';

// Interactive configuration setup
export async function createConfigInteractively(): Promise<Config> {
    console.log(chalk.cyan.bold(`\n🔧 No ${CONFIG_FILE_PATH} found. Let\`s set up your Git Activity Logger!\n`));

    const repositories: RepositoryConfig[] = [];

    // Get repositories
    let addingRepos = true;
    while (addingRepos) {
        console.log(chalk.yellow(`\n📁 Repository ${repositories.length + 1}:`));

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

        if (repositories.length >= 1) {
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

    // Get other configuration options
    console.log(chalk.yellow('\n⚙️  Configuration options:'));
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
            } catch (e) {
                return 'Please enter a valid regular expression.';
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
            } catch (e) {
                return 'Please enter a valid URL or leave empty.';
            }
        }
    });    const config: Config = {
        repositories,
        trackingIntervalMinutes: trackingInterval.value,
        taskIdRegEx: taskPattern.value,
        taskTrackingUrl: taskTrackingUrl.value.trim() || undefined
    };

    // Save the config
    try {
        await writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
        console.log(chalk.green.bold(`\n✅ Configuration saved to ${CONFIG_FILE_PATH}`));
        console.log(chalk.blue('You can edit this file later to make changes.'));
    } catch (error) {
        console.error(chalk.red('❌ Error saving configuration:'), error);
        throw error;
    }

    return config;
}
