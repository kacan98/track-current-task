import path from 'path';
import os from 'os';

/**
 * Gets the OS-appropriate application data directory for the user
 */
export function getAppDataDirectory(): string {
  const platform = os.platform();
  const homeDir = os.homedir();
  
  switch (platform) {
    case 'win32':
      // Windows: %APPDATA%\TrackCurrentTask
      return path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'TrackCurrentTask');
    case 'darwin':
      // macOS: ~/Library/Application Support/TrackCurrentTask
      return path.join(homeDir, 'Library', 'Application Support', 'TrackCurrentTask');
    default:
      // Linux and others: ~/.local/share/TrackCurrentTask
      return path.join(homeDir, '.local', 'share', 'TrackCurrentTask');
  }
}

/**
 * Resolves a path relative to the application data directory
 */
export function resolvePathFromAppData(relativePath: string): string {
  return path.resolve(getAppDataDirectory(), relativePath);
}
