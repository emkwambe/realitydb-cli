const NEON_API_BASE = 'https://console.neon.tech/api/v2';

export interface NeonBranchResult {
  branchId: string;
  endpointId: string;
  host: string;
}

/**
 * Create a Neon branch with a read-write endpoint.
 */
export async function createBranch(
  projectId: string,
  apiKey: string,
  branchName: string,
): Promise<NeonBranchResult> {
  const res = await fetch(`${NEON_API_BASE}/projects/${projectId}/branches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      branch: { name: branchName },
      endpoints: [{ type: 'read_write' }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Neon create branch error (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json() as any;
  const endpoint = data.endpoints?.[0];
  if (!endpoint?.host) {
    throw new Error('Neon returned no endpoint for branch');
  }

  return {
    branchId: data.branch.id,
    endpointId: endpoint.id,
    host: endpoint.host,
  };
}

/**
 * Delete a Neon branch. Ignores 404 (already deleted).
 */
export async function deleteBranch(
  projectId: string,
  apiKey: string,
  branchId: string,
): Promise<void> {
  const res = await fetch(`${NEON_API_BASE}/projects/${projectId}/branches/${branchId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`Neon delete branch error (${res.status}): ${body.slice(0, 300)}`);
  }
}

/**
 * Build a PostgreSQL connection string from a Neon endpoint host.
 */
export function buildConnectionString(
  host: string,
  role: string = 'neondb_owner',
  database: string = 'neondb',
): string {
  return `postgresql://${role}@${host}/${database}?sslmode=require`;
}
