import { neon } from '@neondatabase/serverless';
import type { Env } from './types';

/**
 * Fetch a pre-generated SQL file from R2 and execute it against a Neon branch.
 * Returns the number of tables created.
 */
export async function seedBranch(
  connectionString: string,
  template: string,
  rows: number,
  env: Env,
): Promise<{ tableCount: number }> {
  const key = `templates/${template}-${formatRowCount(rows)}.sql`;
  const object = await env.TEMPLATES.get(key);
  if (!object) {
    throw new Error(`Template SQL not found in R2: ${key}. Available sizes: 5k, 10k, 50k, 100k`);
  }

  const sqlContent = await object.text();
  const sql = neon(connectionString);
  const statements = splitSQL(sqlContent);

  let tableCount = 0;

  // Execute in batches to avoid hitting per-request limits
  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;

    await sql(trimmed);

    if (trimmed.toUpperCase().startsWith('CREATE TABLE')) {
      tableCount++;
    }
  }

  return { tableCount };
}

function formatRowCount(rows: number): string {
  if (rows >= 1000000) return `${Math.round(rows / 1000000)}m`;
  if (rows >= 1000) return `${Math.round(rows / 1000)}k`;
  return String(rows);
}

/**
 * Split SQL text into individual statements, respecting string literals.
 */
function splitSQL(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (inString) {
      current += ch;
      if (ch === stringChar && sql[i + 1] !== stringChar) {
        inString = false;
      } else if (ch === stringChar && sql[i + 1] === stringChar) {
        current += sql[++i];
      }
    } else if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      current += ch;
    } else if (ch === ';') {
      const trimmed = current.trim();
      // Skip pure comment lines
      if (trimmed && !isOnlyComments(trimmed)) {
        statements.push(trimmed);
      }
      current = '';
    } else {
      current += ch;
    }
  }

  const last = current.trim();
  if (last && !isOnlyComments(last)) {
    statements.push(last);
  }

  return statements;
}

function isOnlyComments(s: string): boolean {
  return s.split('\n').every(line => {
    const t = line.trim();
    return t === '' || t.startsWith('--');
  });
}
