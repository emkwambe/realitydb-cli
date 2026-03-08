import type { DataboxConfig } from './types.js';

export const DEFAULT_CONFIG: Omit<DataboxConfig, 'database'> = {
  seed: {
    defaultRecords: 5000,
    batchSize: 1000,
    environment: 'dev',
  },
  export: {
    defaultFormat: 'json',
    outputDir: './.databox',
  },
};
