import type { NeonBranch } from './types';

const NEON_API_BASE = 'https://console.neon.tech/api/v2';

export async function createBranch(
  projectId: string,
  apiKey: string,
  branchName: string,
): Promise<NeonBranch> {
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
    throw new Error(`Neon API error (${res.status}): ${body}`);
  }

  const data = await res.json() as any;
  return {
    id: data.branch.id,
    name: data.branch.name,
    endpoints: data.endpoints.map((ep: any) => ({
      id: ep.id,
      host: ep.host,
    })),
  };
}

export async function deleteBranch(
  projectId: string,
  apiKey: string,
  branchId: string,
): Promise<void> {
  const res = await fetch(`${NEON_API_BASE}/projects/${projectId}/branches/${branchId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`Neon delete error (${res.status}): ${body}`);
  }
}

export function buildConnectionString(
  host: string,
  projectId: string,
  role: string = 'neondb_owner',
  database: string = 'neondb',
): string {
  return `postgresql://${role}@${host}/${database}?sslmode=require`;
}
