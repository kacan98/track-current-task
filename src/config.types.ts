export interface RepositoryConfig {
  path: string;
  mainBranch: string; // Now required, not optional
}

export interface Config {
  repositories: RepositoryConfig[]; // Only accepts objects, not strings
  logIntervalMinutes: number;
  logFilePath: string;
}
