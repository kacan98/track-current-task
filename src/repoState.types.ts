export interface RepoState {
  [repoPath: string]: {
    [branchName: string]: string; // Last known 'git status --porcelain' output
  };
}
