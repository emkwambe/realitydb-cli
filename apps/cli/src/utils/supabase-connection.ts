// apps/cli/src/utils/supabase-connection.ts
// Shared Supabase connection string builder.
//
// IMPORTANT #1: Authenticate with the project's DATABASE password (Project
// Settings -> Database -> Connection string), NOT the service_role/anon API
// key. Passing the API key here fails with "(ENOTFOUND) tenant/user ...
// not found" -- it looks like a connectivity error but is actually an
// auth-credential mismatch.
//
// IMPORTANT #2: Use the direct connection (db.{ref}.supabase.co:5432,
// username "postgres"), not the Supavisor pooler (aws-0-{region}.pooler.
// supabase.com:6543, username "postgres.{ref}"). The pooler hostname is
// region-specific (e.g. aws-0-us-east-2 for an Ohio-hosted project) and a
// hardcoded region produces the same "tenant/user not found" error for any
// project hosted elsewhere. The direct connection format works across all
// regions without needing to know which one a project is in.

export function buildSupabaseConnectionString(
  supabaseUrl: string,
  dbPassword: string
): string {
  const ref = supabaseUrl
    .replace('https://', '')
    .replace('.supabase.co', '')
    .trim();
  // Direct connection — works across all regions. Port 5432 = direct,
  // 6543 = pooler (Supavisor). Direct connection username is just
  // "postgres", not "postgres.{ref}" (that format is pooler-only).
  return `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`;
}
