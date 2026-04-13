import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { buildClaims, signClaims, generateEmbeddedWatermark, computeContentHash, computeTemplateHash } from '../crypto/cert';
import { loadLicense } from '../auth/license';

const PRIVATE_KEY_PATH = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.realitydb', 'private.key');

function getPrivateKey(): string | null {
  // Check env var first
  if (process.env.REALITYDB_SIGNING_KEY) return process.env.REALITYDB_SIGNING_KEY;
  // Check file
  if (fs.existsSync(PRIVATE_KEY_PATH)) return fs.readFileSync(PRIVATE_KEY_PATH, 'utf-8').trim();
  return null;
}

export async function certifyCommand(file: string, options: {
  pack?: string;
  output?: string;
  embed?: boolean;
  complianceLevel?: string;
  expiresIn?: string;
}): Promise<void> {
  const license = loadLicense();
  const privateKey = getPrivateKey();
  
  if (!privateKey) {
    console.error('\n\u274C Signing key not found.');
    console.error('   Set REALITYDB_SIGNING_KEY env var or place key at ~/.realitydb/private.key');
    console.error('   For Mpingo Systems: the key is stored as a Cloudflare Worker secret.\n');
    process.exit(1);
  }
  
  if (!fs.existsSync(file)) {
    console.error('\n\u274C File not found: ' + file + '\n');
    process.exit(1);
  }
  
  console.log('\n\u{1F510} Certifying dataset...');
  
  const sqlContent = fs.readFileSync(file, 'utf-8');
  
  // Extract template info from SQL header comments or pack file
  let packContent = '{}';
  let templateName = 'unknown';
  let tables = 0;
  let totalRows = 0;
  
  if (options.pack && fs.existsSync(options.pack)) {
    packContent = fs.readFileSync(options.pack, 'utf-8');
    const pack = JSON.parse(packContent);
    templateName = pack.name || 'custom';
    tables = Array.isArray(pack.tables) ? pack.tables.length : Object.keys(pack.tables || {}).length;
  }
  
  // Parse row count from SQL comments
  const rowMatch = sqlContent.match(/-- Total rows: ([\d,]+)/);
  if (rowMatch) totalRows = parseInt(rowMatch[1].replace(/,/g, ''));
  
  const tableMatch = sqlContent.match(/CREATE TABLE/gi);
  if (tableMatch) tables = tableMatch.length;
  
  // Strip any existing watermark before hashing
  const cleanContent = sqlContent.replace(/-- ={10,}[\s\S]*?_realitydb_meta[\s\S]*?;\s*$/m, '').trim();
  
  const claims = buildClaims({
    version: require('../../package.json').version || '2.32.1',
    templateName,
    packContent,
    tables,
    totalRows,
    seed: 'unknown',
    tier: license?.plan || 'free',
    userId: license?.email || 'anonymous',
    sqlContent: cleanContent,
  });
  
  // Sign
  const cert = signClaims(claims, privateKey);
  
  // Write detached certificate
  const certPath = options.output || file.replace(/\.sql$/, '.realitydb-cert.json');
  fs.writeFileSync(certPath, JSON.stringify(cert, null, 2), 'utf-8');
  
  console.log('\n\u{1F3F7}\uFE0F  Certificate Generated');
  console.log('\u2500'.repeat(40));
  console.log('   Template:      ' + claims.template);
  console.log('   Template hash: ' + claims.template_hash);
  console.log('   Tables:        ' + claims.tables);
  console.log('   Total rows:    ' + claims.total_rows.toLocaleString());
  console.log('   Content hash:  ' + claims.content_hash);
  console.log('   Key ID:        ' + cert.key_id);
  console.log('   Signature:     ' + cert.signature.substring(0, 32) + '...');
  console.log('\n   \u{1F4C4} Certificate: ' + certPath);
  
  // Optionally embed watermark
  if (options.embed) {
    const watermark = generateEmbeddedWatermark(cert);
    fs.writeFileSync(file, cleanContent + watermark, 'utf-8');
    console.log('   \u{1F3F7}\uFE0F  Watermark embedded in ' + file);
  }
  
  console.log('\n   Verify: realitydb verify ' + file + ' --cert ' + certPath + '\n');
}
