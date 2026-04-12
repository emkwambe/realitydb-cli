import type { Env } from './types';
import { deleteBranch } from './neon';

/**
 * CRON handler: find all labs past their expiry and clean up Neon branches.
 */
export async function cleanupExpiredLabs(env: Env): Promise<number> {
  // Find active labs that have expired
  const expired = await env.DB.prepare(
    "SELECT id, neon_branch_id FROM labs WHERE expires_at < datetime('now') AND status = 'active'"
  ).all<{ id: string; neon_branch_id: string }>();

  let cleaned = 0;

  for (const lab of expired.results) {
    try {
      await deleteBranch(env.NEON_PROJECT_ID, env.NEON_API_KEY, lab.neon_branch_id);
    } catch {
      // Branch may already be gone — continue cleanup
    }

    await env.DB.prepare(
      "UPDATE labs SET status = 'expired', deleted_at = datetime('now') WHERE id = ?"
    ).bind(lab.id).run();

    cleaned++;
  }

  return cleaned;
}
