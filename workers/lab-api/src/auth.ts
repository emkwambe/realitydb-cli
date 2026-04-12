import type { Context } from 'hono';
import type { Env } from './types';

/**
 * Extract API key from Authorization header or request body.
 * Returns the key or null if not provided.
 */
export function extractApiKey(c: Context<{ Bindings: Env }>): string | null {
  // Check Authorization: Bearer <key>
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  // Check X-API-Key header
  const xApiKey = c.req.header('X-API-Key');
  if (xApiKey) return xApiKey.trim();
  return null;
}

/**
 * Validate the API key against the configured secret.
 * For MVP, we use a single shared secret. Production would validate
 * against Supabase user tokens or a key registry.
 */
export function validateApiKey(key: string | null, env: Env): boolean {
  if (!key) return false;
  if (!env.LAB_API_KEY) return false;
  return key === env.LAB_API_KEY;
}

/**
 * Derive a stable user_id from the API key.
 * In production this would come from JWT claims or a user lookup.
 */
export function getUserId(apiKey: string): string {
  // Simple hash for MVP — production would decode a JWT
  let hash = 0;
  for (let i = 0; i < apiKey.length; i++) {
    const ch = apiKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return `user_${Math.abs(hash).toString(36)}`;
}
