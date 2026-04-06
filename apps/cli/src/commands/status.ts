import { loadLicense, checkFeature } from '../auth/license';

export async function statusCommand(options: { json?: boolean; verbose?: boolean }) {
  const license = loadLicense();
  
  // JSON output for scripts
  if (options.json) {
    if (!license) {
      console.log(JSON.stringify({ authenticated: false, tier: 'free' }));
    } else {
      console.log(JSON.stringify({
        authenticated: true,
        email: license.email,
        tier: license.tier,
        expires_at: license.expires_at,
        features: {
          unlimitedRows: checkFeature('unlimited-rows', license),
          sixteenTables: checkFeature('16-tables', license),
          piiMasking: checkFeature('pii-masking', license),
          bugCapture: checkFeature('bug-capture', license),
          auditLogging: checkFeature('audit-logging', license)
        }
      }));
    }
    return;
  }
  
  // Not logged in
  if (!license) {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  🔐 Not Logged In                                             ║
║                                                               ║
║  You are not currently authenticated.                        ║
║                                                               ║
║  Run: realitydb login --api-key YOUR_KEY                     ║
║  Get a key: https://realitydb.dev/dashboard                  ║
║                                                               ║
║  Features available without login:                           ║
║    • Basic data generation (up to 3 tables, 50K rows)        ║
║    • Help and documentation                                  ║
║                                                               ║
║  Features requiring Pro:                                     ║
║    • 16+ tables                                              ║
║    • Unlimited rows                                          ║
║                                                               ║
║  Features requiring Team:                                    ║
║    • PII masking                                             ║
║    • Bug capture                                             ║
║    • Audit logging                                           ║
╚═══════════════════════════════════════════════════════════════╝
    `);
    return;
  }
  
  // Logged in
  const unlimitedRows = checkFeature('unlimited-rows', license);
  const sixteenTables = checkFeature('16-tables', license);
  const piiMasking = checkFeature('pii-masking', license);
  const bugCapture = checkFeature('bug-capture', license);
  const auditLogging = checkFeature('audit-logging', license);
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  ✅ Authenticated                                             ║
║                                                               ║
║  Account: ${license.email}
║  Plan: ${license.tier.toUpperCase()}
║  Expires: ${license.expires_at || 'Never'}
║                                                               ║
║  Features:                                                   ║
║    • 16+ tables: ${sixteenTables ? '✅' : '❌'}                                             ║
║    • Unlimited rows: ${unlimitedRows ? '✅' : '❌'}                                          ║
║    • PII masking: ${piiMasking ? '✅' : '❌'}                                            ║
║    • Bug capture: ${bugCapture ? '✅' : '❌'}                                            ║
║    • Audit logging: ${auditLogging ? '✅' : '❌'}                                           ║
║                                                               ║
║  Run 'realitydb logout' to clear credentials                ║
╚═══════════════════════════════════════════════════════════════╝
  `);
}