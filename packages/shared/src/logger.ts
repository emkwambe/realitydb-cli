export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

export function createLogger(verbose: boolean): Logger {
  return {
    info(message: string, ...args: unknown[]): void {
      console.log(`[databox] ${message}`, ...args);
    },
    warn(message: string, ...args: unknown[]): void {
      console.warn(`[databox] ${message}`, ...args);
    },
    error(message: string, ...args: unknown[]): void {
      console.error(`[databox] ${message}`, ...args);
    },
    debug(message: string, ...args: unknown[]): void {
      if (verbose) {
        console.log(`[databox:debug] ${message}`, ...args);
      }
    },
  };
}
