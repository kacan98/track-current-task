// Shared logger utility for consistent colored output across the application

// ANSI color codes
export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Regular colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
} as const;

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  SUCCESS = 2,
  WARN = 3,
  ERROR = 4
}

// Logger configuration
interface LoggerConfig {
  prefix?: string;
  level: LogLevel;
  showTimestamp: boolean;
  useColors: boolean;
}

class Logger {
  private config: LoggerConfig;
  
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      prefix: config.prefix || '',
      level: config.level ?? (process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL) : LogLevel.INFO),
      showTimestamp: config.showTimestamp ?? process.env.LOG_TIMESTAMP === 'true',
      useColors: config.useColors ?? process.env.NO_COLOR !== 'true',
    };
  }
  
  private format(level: string, levelColor: string, message: string, ..._args: unknown[]): string {
    const parts = [];
    
    if (this.config.showTimestamp) {
      const timestamp = new Date().toISOString();
      parts.push(this.config.useColors ? `${colors.gray}[${timestamp}]${colors.reset}` : `[${timestamp}]`);
    }
    
    if (this.config.prefix) {
      parts.push(this.config.useColors ? `${colors.cyan}[${this.config.prefix}]${colors.reset}` : `[${this.config.prefix}]`);
    }
    
    const levelStr = this.config.useColors ? `${levelColor}${level}${colors.reset}` : level;
    parts.push(levelStr);
    
    parts.push(message);
    
    return parts.join(' ');
  }
  
  debug(message: string, ...args: unknown[]) {
    if (this.config.level <= LogLevel.DEBUG) {
      console.log(this.format('DEBUG', colors.gray, message), ...args);
    }
  }
  
  info(message: string, ...args: unknown[]) {
    if (this.config.level <= LogLevel.INFO) {
      console.log(this.format('INFO', colors.blue, message), ...args);
    }
  }
  
  success(message: string, ...args: unknown[]) {
    if (this.config.level <= LogLevel.SUCCESS) {
      console.log(this.format('✓', colors.green, message), ...args);
    }
  }
  
  warn(message: string, ...args: unknown[]) {
    if (this.config.level <= LogLevel.WARN) {
      console.warn(this.format('WARN', colors.yellow, message), ...args);
    }
  }
  
  error(message: string, ...args: unknown[]) {
    if (this.config.level <= LogLevel.ERROR) {
      console.error(this.format('ERROR', colors.red, message), ...args);
    }
  }
  
  // Special formatting methods
  request(method: string, path: string, status?: number, duration?: number) {
    const methodColor = {
      GET: colors.green,
      POST: colors.blue,
      PUT: colors.yellow,
      DELETE: colors.red,
      PATCH: colors.magenta
    }[method] || colors.white;
    
    let msg = this.config.useColors 
      ? `${methodColor}${method}${colors.reset} ${path}`
      : `${method} ${path}`;
    
    if (status !== undefined) {
      const statusColor = status < 300 ? colors.green : status < 400 ? colors.yellow : colors.red;
      msg += this.config.useColors 
        ? ` ${statusColor}${status}${colors.reset}`
        : ` ${status}`;
    }
    
    if (duration !== undefined) {
      msg += this.config.useColors
        ? ` ${colors.gray}(${duration}ms)${colors.reset}`
        : ` (${duration}ms)`;
    }
    
    console.log(msg);
  }
  
  // Create a child logger with additional prefix
  child(prefix: string): Logger {
    const childPrefix = this.config.prefix 
      ? `${this.config.prefix}:${prefix}`
      : prefix;
    
    return new Logger({
      ...this.config,
      prefix: childPrefix
    });
  }
}

// Default logger instance
export const logger = new Logger();

// Factory function to create named loggers
export function createLogger(prefix: string, config: Partial<LoggerConfig> = {}): Logger {
  return new Logger({ ...config, prefix });
}

// Export the Logger class for custom instances
export { Logger };