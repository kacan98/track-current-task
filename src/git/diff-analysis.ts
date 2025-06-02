import { execGit, branchExists } from './git-utils';

// Helper function to count lines in a file
export async function getLineCount(filePath: string): Promise<number> {
  try {
    const { readFile } = await import('fs/promises');
    const content = await readFile(filePath, 'utf-8');
    return content.split('\n').length;
  } catch (error) {
    // If we can't read the file (binary, permission issues, etc.), return 0
    return 0;
  }
}

export async function getFileDiffStats(repoPath: string, base: string, branch: string): Promise<Record<string, { added: number; deleted: number }> | null> {
  if (!(await branchExists(repoPath, base)) || !(await branchExists(repoPath, branch))) return null;
  try {
    const { stdout } = await execGit(['--no-pager', 'diff', '--numstat', `${base}...${branch}`], { cwd: repoPath });
    if (!stdout.trim()) return {};
    
    const diffStats: Record<string, { added: number; deleted: number }> = {};
    
    // Parse the numstat output
    // Format is: <added lines>\t<deleted lines>\t<file path>
    stdout.trim().split('\n').forEach(line => {
      const [added, deleted, filePath] = line.split('\t');
      
      // Handle binary files which have "-" instead of numbers
      const addedNum = added === '-' ? 0 : parseInt(added, 10);
      const deletedNum = deleted === '-' ? 0 : parseInt(deleted, 10);
      
      diffStats[filePath] = {
        added: addedNum,
        deleted: deletedNum
      };
    });
    
    return diffStats;
  } catch (error) {
    console.error(`Error getting file diff stats between ${base} and ${branch} in ${repoPath}:`, error);
    return null;
  }
}

// Get diff stats for files changed in the working directory (not yet committed)
export async function getWorkingDirDiffStats(repoPath: string): Promise<Record<string, { added: number; deleted: number }> | null> {
  try {
    const { stdout } = await execGit(['--no-pager', 'diff', '--numstat', '-M'], { cwd: repoPath });
    
    const diffStats: Record<string, { added: number; deleted: number }> = {};
    
    // Parse the numstat output for modified/deleted files
    if (stdout.trim()) {
      stdout.trim().split('\n').forEach(line => {
        if (!line.trim()) return; // Skip empty lines
        
        const [added, deleted, filePath] = line.split('\t');
        
        // Handle binary files which have "-" instead of numbers
        const addedNum = added === '-' ? 0 : parseInt(added, 10);
        const deletedNum = deleted === '-' ? 0 : parseInt(deleted, 10);
        
        // Handle renames: filePath might be "old_name => new_name"
        if (filePath.includes(' => ')) {
          const [oldPath, newPath] = filePath.split(' => ');
          // For renames, we track both the old (as deleted lines) and new (as added lines)
          // But since it's the same content, we just track it as the new file with the changes
          diffStats[newPath] = {
            added: addedNum,
            deleted: deletedNum
          };
        } else {
          diffStats[filePath] = {
            added: addedNum,
            deleted: deletedNum
          };
        }
      });
    }

    // Also check staged changes
    const { stdout: stagedStdout } = await execGit(['--no-pager', 'diff', '--cached', '--numstat', '-M'], { cwd: repoPath });
    
    if (stagedStdout.trim()) {
      stagedStdout.trim().split('\n').forEach(line => {
        if (!line.trim()) return; // Skip empty lines
        
        const [added, deleted, filePath] = line.split('\t');
        
        // Handle binary files which have "-" instead of numbers
        const addedNum = added === '-' ? 0 : parseInt(added, 10);
        const deletedNum = deleted === '-' ? 0 : parseInt(deleted, 10);
        
        // Handle renames: filePath might be "old_name => new_name"
        let targetFilePath = filePath;
        if (filePath.includes(' => ')) {
          const [oldPath, newPath] = filePath.split(' => ');
          // For renames, we track both the old (as deleted lines) and new (as added lines)
          // But since it's the same content, we just track it as the new file with the changes
          targetFilePath = newPath;
        }
        
        // Add to existing stats or create new entry
        if (diffStats[targetFilePath]) {
          diffStats[targetFilePath].added += addedNum;
          diffStats[targetFilePath].deleted += deletedNum;
        } else {
          diffStats[targetFilePath] = {
            added: addedNum,
            deleted: deletedNum
          };
        }
      });
    }

    // Also check untracked files and staged renames from git status
    const { stdout: statusStdout } = await execGit(['status', '--porcelain'], { cwd: repoPath });
    
    if (statusStdout.trim()) {
      const statusLines = statusStdout.trim().split('\n');
      
      // Handle untracked files
      const untrackedFiles = statusLines
        .filter(line => line.startsWith('??'))
        .map(line => line.substring(3)); // Remove '?? ' prefix
        // For each untracked file, count its lines (all lines are "added")
      for (const filePath of untrackedFiles) {
        const path = await import('path');
        const fullPath = path.join(repoPath, filePath);
        const lineCount = await getLineCount(fullPath);
        
        diffStats[filePath] = {
          added: lineCount,
          deleted: 0
        };
      }
      
      // Handle staged renames (R  old_name -> new_name)
      const renamedFiles = statusLines
        .filter(line => line.startsWith('R '))
        .map(line => line.substring(3)); // Remove 'R  ' prefix
      
      // For staged renames, we need to get the actual diff stats
      for (const renameLine of renamedFiles) {
        // Rename format in git status: "old_name -> new_name"
        if (renameLine.includes(' -> ')) {
          const [oldPath, newPath] = renameLine.split(' -> ');
          
          // If we don't already have stats for the new file from the staged diff,
          // we should get them (this is mainly for safety - the staged diff should have caught this)
          if (!diffStats[newPath]) {            try {
              // Get the line counts for the renamed file
              const path = await import('path');
              const fullPath = path.join(repoPath, newPath);
              const lineCount = await getLineCount(fullPath);
              
              diffStats[newPath] = {
                added: lineCount,
                deleted: 0 // Renames typically don't have deletions unless content changed
              };
            } catch (error) {
              // If we can't read the file, just note it as a rename without line stats
              console.log(`Note: Detected staged rename ${oldPath} -> ${newPath} but couldn't read line count`);
            }
          }
        }
      }
    }
    
    return diffStats;
  } catch (error) {
    console.error(`Error getting working directory diff stats in ${repoPath}:`, error);
    return null;
  }
}
