import path from 'path';

/**
 * Gets the directory where the executable or source files are located.
 * This works for both compiled executables and when running with npm/node.
 */
export function getExecutableDirectory(): string {
  // Check if we're running from a compiled executable (pkg creates process.pkg)
  if ((process as any).pkg) {
    // We're running from a compiled executable
    return path.dirname(process.execPath);
  }
  
  // We're running with node/npm
  // Use __dirname (available in CommonJS) or derive from main module
  if (typeof __dirname !== 'undefined') {
    // CommonJS environment - go up from src/utils to project root
    return path.resolve(__dirname, '../..');
  }
  
  // Get the directory of the main script
  const mainModulePath = require.main?.filename || process.argv[1];
  if (mainModulePath) {
    // Go up from src/index.js to the project root
    return path.resolve(path.dirname(mainModulePath), '..');
  }
  
  // Fallback: use current working directory (this is what we want to avoid, but better than crashing)
  console.warn('Warning: Could not determine executable directory, falling back to current working directory');
  return process.cwd();
}

/**
 * Resolves a path relative to the executable directory
 */
export function resolvePathFromExecutable(relativePath: string): string {
  return path.resolve(getExecutableDirectory(), relativePath);
}
