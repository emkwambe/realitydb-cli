import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * Compresses a pack JSON string using gzip.
 * Used when sharing packs to reduce transfer size.
 */
export async function compressPack(jsonString: string): Promise<Buffer> {
  return gzipAsync(Buffer.from(jsonString, 'utf-8'));
}

/**
 * Decompresses a gzipped pack buffer back to JSON string.
 */
export async function decompressPack(buffer: Buffer): Promise<string> {
  const result = await gunzipAsync(buffer);
  return result.toString('utf-8');
}
