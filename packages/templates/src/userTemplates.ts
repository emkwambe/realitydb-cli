import { homedir } from 'node:os';
import { join } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';

const USER_TEMPLATE_DIR_NAME = '.realitydb/templates';

/**
 * Returns the path to the user template directory (~/.realitydb/templates/).
 */
export function getUserTemplateDir(): string {
  return join(homedir(), USER_TEMPLATE_DIR_NAME);
}

export interface UserTemplateEntry {
  name: string;
  filePath: string;
}

/**
 * Scans the user template directory for .json files.
 * Returns an empty array if the directory doesn't exist.
 */
export function listUserTemplates(): UserTemplateEntry[] {
  const dir = getUserTemplateDir();
  if (!existsSync(dir)) {
    return [];
  }

  try {
    const files = readdirSync(dir);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({
        name: f.replace(/\.json$/, ''),
        filePath: join(dir, f),
      }));
  } catch {
    return [];
  }
}

/**
 * Resolves a user template by name from ~/.realitydb/templates/<name>.json.
 * Returns the file path if found, undefined otherwise.
 */
export function resolveUserTemplate(name: string): string | undefined {
  const filePath = join(getUserTemplateDir(), `${name}.json`);
  if (existsSync(filePath)) {
    return filePath;
  }
  return undefined;
}
