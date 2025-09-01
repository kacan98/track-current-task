import { execFile } from 'child_process';
import { promisify } from 'util';
import { RepositoryConfig } from '../config/config-types';
import { logger } from '@shared/logger';

const execFileAsync = promisify(execFile);

// Helper function to execute git commands
export async function execGit(args: string[], options: { cwd: string }): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('git', args, options);
  return { stdout: result.stdout || '', stderr: result.stderr || '' };
}

export async function getCurrentBranch(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await execGit(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoPath });
    return stdout.trim();
  } catch (error) {
    logger.error(`Error getting current branch in ${repoPath}:`, String(error));
    return null;
  }
}

export async function getGitStatus(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await execGit(['status', '--porcelain'], { cwd: repoPath });
    return stdout.trim();
  } catch (error) {
    logger.error(`Error getting git status in ${repoPath}:`, String(error));
    return null;
  }
}

export async function branchExists(repoPath: string, branch: string): Promise<boolean> {
  try {
    await execGit(['rev-parse', '--verify', branch], { cwd: repoPath });
    return true;
  } catch {
    return false;
  }
}

export async function getRepositoryName(repoPath: string): Promise<string> {
  try {
    // First try to get the repository name from the remote origin URL
    const { stdout: remoteUrl } = await execGit(['remote', 'get-url', 'origin'], { cwd: repoPath });
    if (remoteUrl.trim()) {
      // Extract repo name from URLs like:
      // https://github.com/user/repo.git -> repo
      // git@github.com:user/repo.git -> repo
      const match = remoteUrl.trim().match(/\/([^/]+?)(?:\.git)?$/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch {
    // Fall back to getting the directory name from git's toplevel
  }

  try {
    // Fallback: use the name of the git repository root directory
    const { stdout: toplevel } = await execGit(['rev-parse', '--show-toplevel'], { cwd: repoPath });
    const repoRoot = toplevel.trim();
    return repoRoot.split(/[/\\]/).pop() || repoPath.split(/[/\\]/).pop() || 'unknown';
  } catch {
    // Final fallback: use the directory name from the provided path
    return repoPath.split(/[/\\]/).pop() || 'unknown';
  }
}

export async function getAvailableBranches(repoPath: string): Promise<string[]> {
  try {
    const { stdout } = await execGit(['branch', '-a'], { cwd: repoPath });
    return stdout
      .split('\n')
      .map(line => line.trim().replace(/^\*\s*/, '').replace(/^remotes\/origin\//, ''))
      .filter(line => line && !line.includes('HEAD ->'))
      .filter((branch, index, arr) => arr.indexOf(branch) === index) // Remove duplicates
      .sort();
  } catch (error) {
    logger.error(`Error getting available branches in ${repoPath}:`, String(error));
    return [];
  }
}

export async function getDefaultBaseBranch(repoPath: string, configuredMainBranch?: string): Promise<string> {
  // First, use configured main branch if provided
  if (configuredMainBranch) {
    if (await branchExists(repoPath, configuredMainBranch)) {
      return configuredMainBranch;
    }
    logger.warn(`Configured main branch '${configuredMainBranch}' does not exist in ${repoPath}, falling back to defaults.`);
  }
  
  // Otherwise try master, then main
  if (await branchExists(repoPath, 'master')) return 'master';
  if (await branchExists(repoPath, 'main')) return 'main';
  return 'master'; // fallback, but will likely error if neither exists
}

export async function getLatestCommitHash(repoPath: string, branch: string): Promise<string | null> {
  if (!(await branchExists(repoPath, branch))) return null;
  try {
    const { stdout } = await execGit(['rev-parse', branch], { cwd: repoPath });
    return stdout.trim();
  } catch (error) {
    logger.error(`Error getting latest commit hash for ${branch} in ${repoPath}:`, String(error));
    return null;
  }
}

export async function getDiffFilesWithBase(repoPath: string, base: string, branch: string): Promise<string[] | null> {
  if (!(await branchExists(repoPath, base)) || !(await branchExists(repoPath, branch))) return null;
  try {
    const { stdout } = await execGit(['diff', '--name-only', `${base}...${branch}`], { cwd: repoPath });
    return stdout.trim() ? stdout.trim().split('\n') : [];
  } catch (error) {
    logger.error(`Error getting diff files between ${base} and ${branch} in ${repoPath}:`, String(error));
    return null;
  }
}

export async function getCommitsNotInBase(repoPath: string, base: string, branch: string): Promise<string[] | null> {
  if (!(await branchExists(repoPath, base)) || !(await branchExists(repoPath, branch))) return null;
  try {
    const { stdout } = await execGit(['log', '--pretty=%H', `${base}..${branch}`], { cwd: repoPath });
    return stdout.trim() ? stdout.trim().split('\n') : [];
  } catch (error) {
    logger.error(`Error getting commits not in ${base} for ${branch} in ${repoPath}:`, String(error));
    return null;
  }
}

// Optimized function to get multiple repository info at once
export async function getRepositoryInfo(repoPath: string, mainBranch?: string): Promise<{
  currentBranch: string | null;
  baseBranch: string;
  gitStatus: string | null;
  currentBranchHash: string | null;
  baseBranchHash: string | null;
  diffFiles: string[] | null;
  commitsNotInBase: string[] | null;
}> {
  try {
    // Get current branch and git status in parallel
    const [branchResult, statusResult] = await Promise.all([
      execGit(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoPath }).catch(() => ({ stdout: '', stderr: '' })),
      execGit(['status', '--porcelain'], { cwd: repoPath }).catch(() => ({ stdout: '', stderr: '' }))
    ]);

    const currentBranch = branchResult.stdout.trim() || null;
    const gitStatus = statusResult.stdout.trim() || null;

    if (!currentBranch) {
      return {
        currentBranch: null,
        baseBranch: 'main',
        gitStatus,
        currentBranchHash: null,
        baseBranchHash: null,
        diffFiles: null,
        commitsNotInBase: null
      };
    }

    // Determine base branch
    let baseBranch = 'main';
    if (mainBranch) {
      baseBranch = mainBranch;
    } else {
      // Quick check for common branches
      const branchCheckResult = await execGit(['branch', '-a'], { cwd: repoPath }).catch(() => ({ stdout: '' }));
      const branches = branchCheckResult.stdout.toLowerCase();
      if (branches.includes('master')) baseBranch = 'master';
      else if (branches.includes('develop')) baseBranch = 'develop';
    }

    // Get hashes, diff files, and commits in parallel
    const [currentHashResult, baseHashResult, diffFilesResult, commitsResult] = await Promise.all([
      execGit(['rev-parse', currentBranch], { cwd: repoPath }).catch(() => ({ stdout: '' })),
      execGit(['rev-parse', baseBranch], { cwd: repoPath }).catch(() => ({ stdout: '' })),
      execGit(['diff', '--name-only', `${baseBranch}...${currentBranch}`], { cwd: repoPath }).catch(() => ({ stdout: '' })),
      execGit(['log', '--pretty=%H', `${baseBranch}..${currentBranch}`], { cwd: repoPath }).catch(() => ({ stdout: '' }))
    ]);

    return {
      currentBranch,
      baseBranch,
      gitStatus,
      currentBranchHash: currentHashResult.stdout.trim() || null,
      baseBranchHash: baseHashResult.stdout.trim() || null,
      diffFiles: diffFilesResult.stdout.trim() ? diffFilesResult.stdout.trim().split('\n') : [],
      commitsNotInBase: commitsResult.stdout.trim() ? commitsResult.stdout.trim().split('\n') : []
    };
  } catch (error) {
    logger.error(`Error getting repository info for ${repoPath}:`, String(error));
    return {
      currentBranch: null,
      baseBranch: 'main',
      gitStatus: null,
      currentBranchHash: null,
      baseBranchHash: null,
      diffFiles: null,
      commitsNotInBase: null
    };
  }
}

export async function discoverRepositories(parentPath: string): Promise<RepositoryConfig[]> {
  const { readdirSync, statSync, existsSync } = await import('fs');
  const { join } = await import('path');
  
  if (!existsSync(parentPath)) {
    throw new Error(`Directory does not exist: ${parentPath}`);
  }

  const repositories: RepositoryConfig[] = [];
  
  try {
    const entries = readdirSync(parentPath);
    
    for (const entry of entries) {
      const fullPath = join(parentPath, entry);
      
      try {
        if (statSync(fullPath).isDirectory()) {
          const gitPath = join(fullPath, '.git');
          if (existsSync(gitPath)) {
            // This is a git repository, detect the default branch
            const availableBranches = await getAvailableBranches(fullPath);
            const commonMainBranches = availableBranches.filter(branch =>
              ['main', 'master', 'develop', 'development', 'dev'].includes(branch.toLowerCase())
            );
            
            // Pick the first common main branch, or fall back to first available branch
            const defaultBranch = commonMainBranches[0] || availableBranches[0];
            
            if (defaultBranch) {
              repositories.push({
                path: fullPath,
                mainBranch: defaultBranch
              });
            }
          }
        }
      } catch (entryError) {
        // Skip entries that can't be processed (permissions, etc.)
        logger.warn(`Skipping ${fullPath}: ${entryError}`);
      }
    }
  } catch (error) {
    throw new Error(`Error reading directory ${parentPath}: ${error}`);
  }
  
  return repositories;
}
