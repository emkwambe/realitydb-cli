// apps/cli/src/utils/supabase-connection.ts
// Shared Supabase pooler connection string builder.
//
// IMPORTANT: Supavisor (Supabase's connection pooler) authenticates with the
// project's DATABASE password (Project Settings -> Database -> Connection
// string), NOT the service_role/anon API key. Passing the API key here
// fails with "(ENOTFOUND) tenant/user ... not found" -- it looks like a
// connectivity error but is actually an auth-credential mismatch.

export function buildSupabaseConnectionString(
  supabaseUrl: string,
  dbPassword: string
): string {
  const ref = supabaseUrl
    .replace('https://', '')
    .replace('.supabase.co', '')
    .trim();
  return `postgresql://postgres.${ref}:${encodeURIComponent(dbPassword)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
}
