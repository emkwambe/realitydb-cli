import { loadLicense } from '../auth/license';

export async function statusCommand(options: { json?: boolean; verbose?: boolean }) {
  const license = loadLicense();
  const tier = license?.tier?.toLowerCase() || 'free';
  const isPaid = tier === 'core' || tier === 'pro' || tier === 'team' || tier === 'enterprise';

  // JSON output for scripts
  if (options.json) {
    console.log(JSON.stringify({
      authenticated: !!license,
      email: license?.email || null,
      tier,
      features: {
        unlimitedRows: isPaid,
        unlimitedTables: isPaid,
        lifecycleRules: isPaid,
        piiMasking: isPaid,
        directSeeding: isPaid,
        simulate: isPaid,
        capture: isPaid,
        auditLogging: isPaid,
      },
    }));
    return;
  }

  // Not logged in
  if (!license) {
    console.log(`
\u{1F680} RealityDB CLI
${'─'.repeat(40)}
   Plan: FREE

   Free tier includes:
   \u2705 Generate up to 50K rows per run
   \u2705 JSON, SQL, CSV export
   \u2705 FK integrity + temporal ordering
   \u2705 --seed for reproducibility
   \u2705 All templates
   \u2705 Schema scanning
   \u2705 Pack management

   Core tier ($49/mo) adds:
   \u{1F512} Lifecycle rules (state machine enforcement)
   \u{1F512} Direct database seeding
   \u{1F512} PII masking (GDPR/HIPAA)
   \u{1F512} Simulate (timeline + scenarios)
   \u{1F512} Bug capture & load
   \u{1F512} Analyze (data-driven strategies)
   \u{1F512} 500K rows/month
${'─'.repeat(40)}
   Login:   realitydb login --api-key YOUR_KEY
   Upgrade: realitydb upgrade
`);
    return;
  }

  // Logged in
  const check = (allowed: boolean) => allowed ? '\u2705' : '\u{1F512}';

  console.log(`
\u{1F680} RealityDB CLI
${'─'.repeat(40)}
   Account: ${license.email}
   Plan:    ${tier.toUpperCase()}
   Expires: ${license.expires_at || 'Never'}
${'─'.repeat(40)}
   Features:
   ${check(true)} Generate data (JSON, SQL, CSV)
   ${check(true)} FK integrity + temporal ordering
   ${check(true)} --seed reproducibility
   ${check(true)} Schema scanning
   ${check(true)} Pack management
   ${check(isPaid)} Lifecycle rules
   ${check(isPaid)} Unlimited rows (500K/month)
   ${check(isPaid)} Direct database seeding
   ${check(isPaid)} PII masking (GDPR/HIPAA)
   ${check(isPaid)} Simulate (timeline + scenarios)
   ${check(isPaid)} Bug capture & load
   ${check(isPaid)} Analyze (data-driven strategies)
   ${check(isPaid)} Audit logging
${'─'.repeat(40)}
   Logout:  realitydb logout
   Upgrade: realitydb upgrade
`);
}
