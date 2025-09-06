import chalk from 'chalk';

// Simple 3-color background tracker palette
export const colors = {
  primary: chalk.blue,      // Blue - main brand, tasks
  success: chalk.green,     // Green - hours, success states  
  muted: chalk.gray,        // Gray - secondary text, timestamps
} as const;