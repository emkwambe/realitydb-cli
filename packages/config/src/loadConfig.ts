import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { DataboxConfig } from './types.js';
import { DEFAULT_CONFIG } from './defaults.js';

export async function loadConfig(
  filePath: string = './databox.config.json',
): Promise<DataboxConfig> {
  const resolvedPath = resolve(filePath);

  let raw: string;
  try {
    raw = await readFile(resolvedPath, 'utf-8');
  } catch {
    throw new Error(
      `[databox] Config file not found: ${resolvedPath}\n` +
        'Create a databox.config.json or specify a path with --config.',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `[databox] Invalid JSON in config file: ${resolvedPath}`,
    );
  }

  const config = parsed as Record<string, unknown>;

  const database = config['database'] as
    | Record<string, unknown>
    | undefined;
  if (!database || typeof database['connectionString'] !== 'string') {
    throw new Error(
      '[databox] Config validation failed: database.connectionString is required.',
    );
  }

  return {
    database: {
      client: 'postgres',
      connectionString: database['connectionString'] as string,
    },
    seed: {
      ...DEFAULT_CONFIG.seed,
      ...((config['seed'] as Record<string, unknown>) ?? {}),
    },
    template: config['template'] as string | undefined,
    export: {
      ...DEFAULT_CONFIG.export!,
      ...((config['export'] as Record<string, unknown>) ?? {}),
    },
  } as DataboxConfig;
}
