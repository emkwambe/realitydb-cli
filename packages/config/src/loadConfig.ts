import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { DataboxConfig } from './types.js';
import { DEFAULT_CONFIG } from './defaults.js';

const CONFIG_FILES = ['seedforge.config.json', 'databox.config.json'];

async function findConfigFile(basePath: string): Promise<string | null> {
  for (const name of CONFIG_FILES) {
    const fullPath = resolve(basePath, name);
    try {
      await access(fullPath);
      return fullPath;
    } catch {
      continue;
    }
  }
  return null;
}

export async function loadConfig(
  filePath?: string,
): Promise<DataboxConfig> {
  let resolvedPath: string;

  if (filePath) {
    resolvedPath = resolve(filePath);
  } else {
    const found = await findConfigFile('.');
    if (!found) {
      throw new Error(
        `[seedforge] Config file not found.\n` +
          'Create a seedforge.config.json or specify a path with --config.',
      );
    }
    resolvedPath = found;
  }

  let raw: string;
  try {
    raw = await readFile(resolvedPath, 'utf-8');
  } catch {
    throw new Error(
      `[seedforge] Config file not found: ${resolvedPath}\n` +
        'Create a seedforge.config.json or specify a path with --config.',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `[seedforge] Invalid JSON in config file: ${resolvedPath}`,
    );
  }

  const config = parsed as Record<string, unknown>;

  const database = config['database'] as
    | Record<string, unknown>
    | undefined;
  if (!database || typeof database['connectionString'] !== 'string') {
    throw new Error(
      '[seedforge] Config validation failed: database.connectionString is required.',
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
