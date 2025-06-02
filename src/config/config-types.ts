export interface RepositoryConfig {
  path: string;
  mainBranch: string; // Now required, not optional
}

export interface Config {
  repositories: RepositoryConfig[]; // Only accepts objects, not strings
  trackingIntervalMinutes: number; // How often to check for changes
  taskIdRegEx?: string; // Optional: Pattern to extract task IDs, defaults to "DFO-\\d+"
}
