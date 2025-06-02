import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Helper function to execute git commands
export async function execGit(args: string[], options: { cwd: string }): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execFileAsync('git', args, options);
    return { stdout: result.stdout || '', stderr: result.stderr || '' };
  } catch (error: any) {
    // If the command fails, throw the error so callers can handle it
    throw error;
  }
}

export async function getCurrentBranch(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await execGit(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoPath });
    return stdout.trim();
  } catch (error) {
    console.error(`Error getting current branch in ${repoPath}:`, error);
    return null;
  }
}

export async function getGitStatus(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await execGit(['status', '--porcelain'], { cwd: repoPath });
    return stdout.trim();
  } catch (error) {
    console.error(`Error getting git status in ${repoPath}:`, error);
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
    console.error(`Error getting available branches in ${repoPath}:`, error);
    return [];
  }
}

export async function getDefaultBaseBranch(repoPath: string, configuredMainBranch?: string): Promise<string> {
  // First, use configured main branch if provided
  if (configuredMainBranch) {
    if (await branchExists(repoPath, configuredMainBranch)) {
      return configuredMainBranch;
    }
    console.warn(`Configured main branch '${configuredMainBranch}' does not exist in ${repoPath}, falling back to defaults.`);
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
    console.error(`Error getting latest commit hash for ${branch} in ${repoPath}:`, error);
    return null;
  }
}

export async function getDiffFilesWithBase(repoPath: string, base: string, branch: string): Promise<string[] | null> {
  if (!(await branchExists(repoPath, base)) || !(await branchExists(repoPath, branch))) return null;
  try {
    const { stdout } = await execGit(['diff', '--name-only', `${base}...${branch}`], { cwd: repoPath });
    return stdout.trim() ? stdout.trim().split('\n') : [];
  } catch (error) {
    console.error(`Error getting diff files between ${base} and ${branch} in ${repoPath}:`, error);
    return null;
  }
}

export async function getCommitsNotInBase(repoPath: string, base: string, branch: string): Promise<string[] | null> {
  if (!(await branchExists(repoPath, base)) || !(await branchExists(repoPath, branch))) return null;
  try {
    const { stdout } = await execGit(['log', '--pretty=%H', `${base}..${branch}`], { cwd: repoPath });
    return stdout.trim() ? stdout.trim().split('\n') : [];
  } catch (error) {
    console.error(`Error getting commits not in ${base} for ${branch} in ${repoPath}:`, error);
    return null;
  }
}
