import { loadLicense } from '../auth/license';

export async function upgradeCommand(options: {
  plan?: string;
}): Promise<void> {
  const license = loadLicense();
  const plan = options.plan || 'pro';

  const PLANS: Record<string, { name: string; price: string; url: string }> = {
    pro: {
      name: 'PRO',
      price: '$79/mo',
      url: 'https://buy.stripe.com/realitydb-pro', // TODO: Replace with real Stripe link
    },
    team: {
      name: 'TEAM',
      price: '$249/mo',
      url: 'https://buy.stripe.com/realitydb-team',
    },
    enterprise: {
      name: 'ENTERPRISE',
      price: 'Custom',
      url: 'https://realitydb.dev/contact',
    },
  };

  const selected = PLANS[plan.toLowerCase()];

  if (!selected) {
    console.error(`\n\u274C Unknown plan: ${plan}`);
    console.error(`   Available plans: ${Object.keys(PLANS).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n\u{1F680} RealityDB Upgrade`);
  console.log(`${'\u2500'.repeat(40)}`);

  if (license) {
    console.log(`   Current plan: ${license.tier.toUpperCase()}`);
    console.log(`   User: ${license.email}`);
  } else {
    console.log(`   Current plan: FREE`);
  }

  console.log(`   Upgrade to: ${selected.name} (${selected.price})`);
  console.log(`${'\u2500'.repeat(40)}`);

  console.log(`\n   Plan features:`);

  if (plan === 'pro') {
    console.log(`   \u2022 Unlimited rows`);
    console.log(`   \u2022 All export formats (JSON, SQL, CSV)`);
    console.log(`   \u2022 Direct database seeding`);
    console.log(`   \u2022 PII masking (GDPR + HIPAA)`);
    console.log(`   \u2022 Schema analysis`);
    console.log(`   \u2022 Lifecycle rules`);
  } else if (plan === 'team') {
    console.log(`   \u2022 Everything in PRO`);
    console.log(`   \u2022 Up to 10 seats`);
    console.log(`   \u2022 Bug capture & environment sharing`);
    console.log(`   \u2022 Priority support`);
  } else if (plan === 'enterprise') {
    console.log(`   \u2022 Everything in TEAM`);
    console.log(`   \u2022 Unlimited seats`);
    console.log(`   \u2022 SSO / SAML`);
    console.log(`   \u2022 On-prem deployment`);
    console.log(`   \u2022 Dedicated support + TAM`);
    console.log(`   \u2022 BAA for HIPAA compliance`);
  }

  // Open browser
  console.log(`\n   Opening checkout...`);

  try {
    const open = (await import('open')).default;
    await open(selected.url);
    console.log(`   \u2705 Opened ${selected.url}`);
  } catch {
    console.log(`   Visit: ${selected.url}`);
  }

  console.log(`\n   After purchasing, run:`);
  console.log(`   realitydb login --api-key <your-new-key>\n`);
}
