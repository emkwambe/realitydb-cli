export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

export function createLogger(verbose: boolean): Logger {
  return {
    info(message: string, ...args: unknown[]): void {
      console.log(message, ...args);
    },
    warn(message: string, ...args: unknown[]): void {
      console.warn(message, ...args);
    },
    error(message: string, ...args: unknown[]): void {
      console.error(message, ...args);
    },
    debug(message: string, ...args: unknown[]): void {
      if (verbose) {
        console.log(`[debug] ${message}`, ...args);
      }
    },
  };
}
