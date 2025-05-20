/**
 * Logging level definition
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Logger output destination
 */
export enum LogDestination {
  STDOUT = 'stdout',
  STDERR = 'stderr',
  FILE = 'file',
  NONE = 'none'
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level?: LogLevel;
  destination?: LogDestination;
  filePath?: string;
}

/**
 * Logger class
 */
export class Logger {
  private static instance: Logger;
  private level: LogLevel = LogLevel.INFO;
  private destination: LogDestination = LogDestination.STDOUT;
  private filePath?: string;
  private fileStream?: import('fs').WriteStream;

  private constructor() {}

  /**
   * Return singleton instance
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Configure logger
   */
  public configure(config: LoggerConfig): void {
    if (config.level) {
      this.level = config.level;
    }

    if (config.destination) {
      this.destination = config.destination;

      // Close existing file stream if we had one
      if (this.fileStream) {
        try {
          this.fileStream.end();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
          // Ignore errors when closing
        }
        this.fileStream = undefined;
      }

      // Set up file stream if needed
      if (config.destination === LogDestination.FILE && config.filePath) {
        this.filePath = config.filePath;
        try {
          // Using dynamic import for fs
          import('fs').then(fs => {
            this.fileStream = fs.createWriteStream(this.filePath as string, { flags: 'a' });
          }).catch(error => {
            // eslint-disable-next-line no-console
            console.error(`[ERROR] Failed to open log file: ${(error as Error).message}`);
            this.destination = LogDestination.STDERR;
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`[ERROR] Failed to import fs module: ${(error as Error).message}`);
          this.destination = LogDestination.STDERR;
        }
      }
    }
  }

  /**
   * Set logging level
   */
  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Debug log
   */
  public debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.writeLog('DEBUG', message, args);
    }
  }

  /**
   * Info log
   */
  public info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.writeLog('INFO', message, args);
    }
  }

  /**
   * Warning log
   */
  public warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.writeLog('WARN', message, args);
    }
  }

  /**
   * Error log
   */
  public error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.writeLog('ERROR', message, args);
    }
  }

  /**
   * Write log to the configured destination
   */
  private writeLog(level: string, message: string, args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;

    switch (this.destination) {
    case LogDestination.STDOUT:
      // eslint-disable-next-line no-console
      console.log(logMessage, ...args);
      break;
    case LogDestination.STDERR:
      // eslint-disable-next-line no-console
      console.error(logMessage, ...args);
      break;
    case LogDestination.FILE:
      if (this.fileStream) {
        const formattedArgs = args.length > 0 ? ' ' + args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ') : '';
        this.fileStream.write(`${logMessage}${formattedArgs}\n`);
      }
      break;
    case LogDestination.NONE:
      // Do nothing
      break;
    }
  }

  /**
   * Check whether to log
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.destination === LogDestination.NONE) {
      return false;
    }

    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
}

// Create logger instance
export const logger = Logger.getInstance();
