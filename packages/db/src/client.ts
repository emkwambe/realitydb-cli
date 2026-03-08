import pg from 'pg';

export function createPostgresClient(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString });
}

export async function testConnection(pool: pg.Pool): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[databox] Database connection failed: ${message}`);
  }
}

export async function closeConnection(pool: pg.Pool): Promise<void> {
  try {
    await pool.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[databox] Failed to close database connection: ${message}`);
  }
}
