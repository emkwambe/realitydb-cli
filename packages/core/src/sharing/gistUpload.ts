import https from 'node:https';

export interface GistOptions {
  filename: string;
  description?: string;
  public?: boolean;
}

export interface GistResult {
  url: string;
  rawUrl: string;
  gistId: string;
}

/**
 * Uploads content to a GitHub Gist.
 * Requires GITHUB_TOKEN environment variable.
 */
export async function uploadToGist(
  content: string,
  options: GistOptions,
): Promise<GistResult> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      'GITHUB_TOKEN not set.\n' +
      'To share via Gist, set the GITHUB_TOKEN environment variable.\n' +
      'Create a token at: https://github.com/settings/tokens\n' +
      'Required scope: gist',
    );
  }

  const sizeBytes = Buffer.byteLength(content, 'utf-8');
  if (sizeBytes > 10 * 1024 * 1024) {
    throw new Error(
      `Pack size (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds 10 MB Gist limit. ` +
      'Consider capturing fewer tables or using --tables to select specific tables.',
    );
  }

  const body = JSON.stringify({
    description: options.description ?? 'RealityDB Reality Pack',
    public: options.public ?? true,
    files: {
      [options.filename]: { content },
    },
  });

  return new Promise<GistResult>((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: '/gists',
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'realitydb-cli',
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(data) as {
                html_url: string;
                id: string;
                files: Record<string, { raw_url: string }>;
              };
              const fileEntry = parsed.files[options.filename];
              resolve({
                url: parsed.html_url,
                rawUrl: fileEntry?.raw_url ?? parsed.html_url,
                gistId: parsed.id,
              });
            } catch {
              reject(new Error('Failed to parse GitHub Gist response'));
            }
          } else {
            reject(new Error(`GitHub API error (${res.statusCode}): ${data}`));
          }
        });
      },
    );

    req.on('error', (err) => {
      reject(new Error(`Failed to connect to GitHub API: ${err.message}`));
    });

    req.write(body);
    req.end();
  });
}
