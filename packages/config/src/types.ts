export interface DataboxConfig {
  database: {
    client: 'postgres' | 'mysql';
    connectionString: string;
  };
  seed: {
    defaultRecords: number;
    batchSize: number;
    environment: string;
    randomSeed?: number;
  };
  template?: string;
  export?: {
    defaultFormat: 'json' | 'csv' | 'sql';
    outputDir: string;
  };
}
