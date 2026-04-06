import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.realitydb');
const LICENSE_FILE = path.join(CONFIG_DIR, 'license.json');
const TOKEN_FILE = path.join(CONFIG_DIR, 'token.json');

export interface License {
  id: string;
  tier: 'free' | 'pro' | 'team' | 'enterprise';
  email: string;
  user_id: string;
  issued_at: string;
  expires_at: string | null;
  features: string[];
  seat_limit: number | null;
  organization_id: string | null;
  organization_name: string | null;
  signature: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

// Feature to tier mapping
export const FEATURE_TIERS: Record<string, string> = {
  'basic-generation': 'free',
  'unlimited-rows': 'pro',
  'all-templates': 'pro',
  'timeline': 'pro',
  'scenario-injection': 'pro',
  'parquet-export': 'pro',
  '16-tables': 'pro',
  'pii-masking': 'team',
  'audit-logging': 'team',
  'bug-capture': 'team',
  'reality-packs': 'team',
  'studio-edit': 'team',
  'studio-ai': 'enterprise',
  'on-prem-deployment': 'enterprise',
  'sso-saml': 'enterprise',
  'compliance-artifacts': 'enterprise'
};

const TIER_ORDER = ['free', 'pro', 'team', 'enterprise'];

export function getMaxRows(license: License | null): number {
  if (!license) return 50000;
  if (license.tier === 'pro') return Infinity;
  if (license.tier === 'team') return Infinity;
  if (license.tier === 'enterprise') return Infinity;
  return 50000;
}

export function getMaxTables(license: License | null): number {
  if (!license) return 3;
  if (license.tier === 'pro') return 16;
  if (license.tier === 'team') return 16;
  if (license.tier === 'enterprise') return Infinity;
  return 3;
}

export function checkFeature(feature: string, license: License | null): boolean {
  const requiredTier = FEATURE_TIERS[feature];
  if (!requiredTier) return true;
  
  const userTier = license?.tier || 'free';
  
  // Direct tier comparison
  if (requiredTier === 'team') {
    return userTier === 'team' || userTier === 'enterprise';
  }
  
  if (requiredTier === 'pro') {
    return userTier === 'pro' || userTier === 'team' || userTier === 'enterprise';
  }
  
  if (requiredTier === 'free') {
    return true;
  }
  
  return false;
}

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function saveLicense(license: License): void {
  ensureConfigDir();
  fs.writeFileSync(LICENSE_FILE, JSON.stringify(license, null, 2));
}

export function loadLicense(): License | null {
  try {
    if (!fs.existsSync(LICENSE_FILE)) return null;
    const data = fs.readFileSync(LICENSE_FILE, 'utf-8');
    const license = JSON.parse(data) as License;
    
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      return null;
    }
    
    return license;
  } catch {
    return null;
  }
}

export function clearLicense(): void {
  try {
    if (fs.existsSync(LICENSE_FILE)) fs.unlinkSync(LICENSE_FILE);
  } catch {}
}

export function saveToken(token: Token): void {
  ensureConfigDir();
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2));
}

export function loadToken(): Token | null {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return null;
    const data = fs.readFileSync(TOKEN_FILE, 'utf-8');
    return JSON.parse(data) as Token;
  } catch {
    return null;
  }
}

export function clearToken(): void {
  try {
    if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
  } catch {}
}

export function requireAuth(feature: string): License | null {
  const license = loadLicense();
  
  if (!license) {
    console.error(`
╔═══════════════════════════════════════════════════════════════╗
║  ❌ Authentication Required                                   ║
║                                                               ║
║  Feature: ${feature}                                          ║
║                                                               ║
║  Run: realitydb login --api-key YOUR_KEY                     ║
║  Get a key: https://realitydb.dev/dashboard                  ║
╚═══════════════════════════════════════════════════════════════╝
    `);
    process.exit(1);
  }
  
  const hasAccess = checkFeature(feature, license);
  
  if (!hasAccess) {
    const requiredTier = FEATURE_TIERS[feature];
    console.error(`
╔═══════════════════════════════════════════════════════════════╗
║  ❌ Plan Upgrade Required                                     ║
║                                                               ║
║  Feature: ${feature}                                          ║
║  Current plan: ${license.tier.toUpperCase()}                                ║
║  Required: ${requiredTier?.toUpperCase()} plan                             ║
║                                                               ║
║  Upgrade: realitydb upgrade                                  ║
║  View plans: https://realitydb.dev/pricing                   ║
╚═══════════════════════════════════════════════════════════════╝
    `);
    process.exit(1);
  }
  
  return license;
}

export function getLicenseInfo(): { hasLicense: boolean; tier?: string; email?: string } {
  const license = loadLicense();
  if (!license) return { hasLicense: false };
  return { hasLicense: true, tier: license.tier, email: license.email };
}