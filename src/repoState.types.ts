export interface RepoBranchState {
  status: string; // Last known 'git status --porcelain' output
  commitHash: string | null;
  masterHash: string | null;
  diffFiles: string[] | null;
  commitsNotInMaster?: string[] | null;
  numCommitsNotInMaster?: number;
}

export interface RepoState {
  [repoPath: string]: {
    [branchName: string]: RepoBranchState;
  };
}
