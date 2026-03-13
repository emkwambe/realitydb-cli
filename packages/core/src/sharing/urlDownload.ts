import https from 'node:https';
import http from 'node:http';
import { decompressPack } from './compress.js';

/**
 * Downloads a Reality Pack from a URL.
 * Supports direct JSON URLs, GitHub Gist URLs, and gzipped packs.
 */
export async function downloadPack(url: string): Promise<string> {
  const resolvedUrl = resolveGistUrl(url);
  const raw = await fetchUrl(resolvedUrl);

  // If the URL ends with .gz, decompress first
  if (resolvedUrl.endsWith('.gz') || url.endsWith('.gz')) {
    const content = await decompressPack(Buffer.from(raw, 'binary'));
    validatePackContent(content);
    return content;
  }

  // For Gist HTML pages, try to extract the raw content
  if (url.includes('gist.github.com') && !resolvedUrl.includes('/raw')) {
    // We already resolved to raw URL, but if content looks like HTML, error out
    if (raw.trimStart().startsWith('<!') || raw.trimStart().startsWith('<html')) {
      throw new Error(
        'Received HTML instead of JSON. Make sure the URL points to a raw Gist file.\n' +
        'Tip: Append /raw to the Gist URL.',
      );
    }
  }

  validatePackContent(raw);
  return raw;
}

/**
 * Resolves a GitHub Gist URL to its raw content URL.
 */
function resolveGistUrl(url: string): string {
  // Already a raw URL
  if (url.includes('/raw')) {
    return url;
  }

  // GitHub Gist URL: https://gist.github.com/user/id → append /raw
  const gistMatch = url.match(/^https?:\/\/gist\.github\.com\/[\w-]+\/[\w]+$/);
  if (gistMatch) {
    return `${url}/raw`;
  }

  return url;
}

/**
 * Validates that content is a valid Reality Pack JSON.
 */
function validatePackContent(content: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Downloaded content is not valid JSON. Check the URL.');
  }

  const pack = parsed as Record<string, unknown>;
  if (pack.format !== 'realitydb-pack' && pack.format !== 'databox-reality-pack') {
    throw new Error(
      `Downloaded content is not a valid Reality Pack (format: "${String(pack.format ?? 'unknown')}").`,
    );
  }
}

/**
 * Fetches content from a URL using node:https/http.
 * Follows redirects up to 5 times.
 */
function fetchUrl(url: string, redirectCount = 0): Promise<string> {
  if (redirectCount > 5) {
    throw new Error('Too many redirects');
  }

  const lib = url.startsWith('https') ? https : http;

  return new Promise<string>((resolve, reject) => {
    const req = lib.get(
      url,
      {
        headers: {
          'User-Agent': 'realitydb-cli',
          'Accept': 'application/json, application/octet-stream, */*',
        },
      },
      (res) => {
        // Follow redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve(fetchUrl(res.headers.location, redirectCount + 1));
          return;
        }

        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          reject(new Error(`HTTP ${res.statusCode} when downloading from ${url}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => { chunks.push(chunk); });
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer.toString('utf-8'));
        });
      },
    );

    req.on('error', (err) => {
      reject(new Error(`Failed to download from ${url}: ${err.message}`));
    });
  });
}
