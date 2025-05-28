export interface RepoBranchState {
  status: string; // Last known 'git status --porcelain' output
  commitHash: string | null;
  masterHash: string | null;
  diffFiles: string[] | null;
  commitsNotInMaster?: string[] | null;
  numCommitsNotInMaster?: number;
  diffStats?: Record<string, {
    added: number;
    deleted: number;
  }> | null;
  workingDirDiffStats?: Record<string, {
    added: number;
    deleted: number;
  }> | null;
  lastLogTime?: number; // Timestamp of the last time we logged for this branch
}

export interface RepoState {
  [repoPath: string]: {
    [branchName: string]: RepoBranchState;
  };
}
