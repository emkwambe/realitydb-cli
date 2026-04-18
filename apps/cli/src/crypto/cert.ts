import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'crypto';

// Ed25519 public key for RealityDB (SPKI DER format, hex encoded)
// This is embedded in the CLI — anyone can verify without a secret
let REALITYDB_PUBLIC_KEY_HEX = '302a300506032b6570032100d84f7fff981d8049cc543cb4e9b2b7a274d2ce6fee4d732bd32750a04c98c134';

const KEY_ID = 'realitydb-2026';

export interface CertClaims {
  generator: string;
  version: string;
  template: string;
  template_hash: string;
  tables: number;
  total_rows: number;
  seed: string;
  generated_at: string;
  license_tier: string;
  user_id: string;
  content_hash: string;
  neon_branch_id?: string;
  compliance_assertions?: {
    pii_masked?: boolean;
    k_anonymity?: number;
  };
}

export interface Certificate {
  version: '1.0';
  key_id: string;
  claims: CertClaims;
  signature: string; // hex-encoded Ed25519 signature
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

export function computeContentHash(content: string): string {
  return 'sha256:' + sha256(content).substring(0, 32);
}

export function computeTemplateHash(packContent: string): string {
  return 'sha256:' + sha256(packContent).substring(0, 32);
}

export function buildClaims(opts: {
  version: string;
  templateName: string;
  packContent: string;
  tables: number;
  totalRows: number;
  seed: string;
  tier: string;
  userId: string;
  sqlContent: string;
  neonBranchId?: string;
  piiMasked?: boolean;
}): CertClaims {
  return {
    generator: 'realitydb-cli',
    version: opts.version,
    template: opts.templateName,
    template_hash: computeTemplateHash(opts.packContent),
    tables: opts.tables,
    total_rows: opts.totalRows,
    seed: opts.seed || 'random',
    generated_at: new Date().toISOString(),
    license_tier: opts.tier,
    user_id: opts.userId,
    content_hash: computeContentHash(opts.sqlContent),
    neon_branch_id: opts.neonBranchId,
    compliance_assertions: {
      pii_masked: opts.piiMasked || false,
    },
  };
}

export function signClaims(claims: CertClaims, privateKeyHex: string): Certificate {
  const payload = JSON.stringify(claims, null, 0);
  const privKeyDer = Buffer.from(privateKeyHex, 'hex');
  const privKey = createPrivateKey({ key: privKeyDer, format: 'der', type: 'pkcs8' });
  const sig = sign(null, Buffer.from(payload), privKey);
  
  return {
    version: '1.0',
    key_id: KEY_ID,
    claims,
    signature: sig.toString('hex'),
  };
}

export function verifyCertificate(cert: Certificate, publicKeyHex?: string): { valid: boolean; reason: string } {
  const pubHex = publicKeyHex || REALITYDB_PUBLIC_KEY_HEX;
  if (pubHex === '__PLACEHOLDER__') {
    return { valid: false, reason: 'Public key not configured. Run key generation first.' };
  }
  
  try {
    const payload = JSON.stringify(cert.claims, null, 0);
    const pubKeyDer = Buffer.from(pubHex, 'hex');
    const pubKey = createPublicKey({ key: pubKeyDer, format: 'der', type: 'spki' });
    const sigBuf = Buffer.from(cert.signature, 'hex');
    
    const valid = verify(null, Buffer.from(payload), pubKey, sigBuf);
    
    if (valid) {
      return { valid: true, reason: 'Ed25519 signature verified — dataset is authentic and signed by RealityDB' };
    } else {
      return { valid: false, reason: 'Ed25519 signature verification failed — certificate may be forged or tampered' };
    }
  } catch (err: any) {
    return { valid: false, reason: 'Verification error: ' + err.message };
  }
}

export function verifyContentIntegrity(cert: Certificate, datasetContent: string): { valid: boolean; reason: string } {
  const actualHash = computeContentHash(datasetContent);
  if (actualHash === cert.claims.content_hash) {
    return { valid: true, reason: 'Content hash matches — dataset has not been modified' };
  } else {
    return { valid: false, reason: 'Content hash mismatch — dataset has been modified after certification' };
  }
}

export function generateEmbeddedWatermark(cert: Certificate): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('-- ============================================');
  lines.push('-- REALITYDB CERTIFIED DATASET');
  lines.push('-- Verify: realitydb verify <file> --cert <cert.json>');
  lines.push('-- ============================================');
  lines.push('CREATE TABLE IF NOT EXISTS "_realitydb_meta" (');
  lines.push('  "key" TEXT PRIMARY KEY,');
  lines.push('  "value" TEXT NOT NULL');
  lines.push(');');
  lines.push('');
  
  const meta: [string, string][] = [
    ['cert_version', cert.version],
    ['key_id', cert.key_id],
    ['generator', cert.claims.generator],
    ['version', cert.claims.version],
    ['template', cert.claims.template],
    ['template_hash', cert.claims.template_hash],
    ['tables', String(cert.claims.tables)],
    ['total_rows', String(cert.claims.total_rows)],
    ['seed', cert.claims.seed],
    ['generated_at', cert.claims.generated_at],
    ['license_tier', cert.claims.license_tier],
    ['user_id', cert.claims.user_id],
    ['content_hash', cert.claims.content_hash],
    ['signature', cert.signature],
  ];
  
  if (cert.claims.neon_branch_id) {
    meta.push(['neon_branch_id', cert.claims.neon_branch_id]);
  }
  
  lines.push('INSERT INTO "_realitydb_meta" ("key", "value") VALUES');
  lines.push(meta.map(([k, v]) => "  ('" + k + "', '" + v.replace(/'/g, "''") + "')").join(',\n') + ';');
  lines.push('');
  
  return lines.join('\n');
}

export function parseCertFromSQL(sqlContent: string): Certificate | null {
  const metaRegex = /INSERT INTO "_realitydb_meta".*?VALUES\s*([\s\S]*?);/;
  const match = sqlContent.match(metaRegex);
  if (!match) return null;
  
  const meta: Record<string, string> = {};
  const rowRegex = /\('([^']+)',\s*'([^']*)'\)/g;
  let m;
  while ((m = rowRegex.exec(match[1])) !== null) {
    meta[m[1]] = m[2];
  }
  
  if (!meta.signature || !meta.generator) return null;
  
  return {
    version: (meta.cert_version as '1.0') || '1.0',
    key_id: meta.key_id || 'unknown',
    claims: {
      generator: meta.generator,
      version: meta.version,
      template: meta.template,
      template_hash: meta.template_hash,
      tables: parseInt(meta.tables || '0'),
      total_rows: parseInt(meta.total_rows || '0'),
      seed: meta.seed,
      generated_at: meta.generated_at,
      license_tier: meta.license_tier,
      user_id: meta.user_id,
      content_hash: meta.content_hash,
    },
    signature: meta.signature,
  };
}

export function setPublicKey(hex: string) {
  REALITYDB_PUBLIC_KEY_HEX = hex;
}
