import fs from 'fs';
import { verifyCertificate, verifyContentIntegrity, parseCertFromSQL, computeContentHash } from '../crypto/cert';

export async function verifyCommand(file: string, options: {
  cert?: string;
  publicKey?: string;
  json?: boolean;
}): Promise<void> {
  if (!fs.existsSync(file)) {
    console.error('\n\u274C File not found: ' + file + '\n');
    process.exit(1);
  }
  
  const fileContent = fs.readFileSync(file, 'utf-8');
  let cert: any = null;
  
  // Try detached certificate first
  if (options.cert && fs.existsSync(options.cert)) {
    cert = JSON.parse(fs.readFileSync(options.cert, 'utf-8'));
  } else {
    // Try to find .realitydb-cert.json next to the file
    const autoCertPath = file.replace(/\.sql$/, '.realitydb-cert.json');
    if (fs.existsSync(autoCertPath)) {
      cert = JSON.parse(fs.readFileSync(autoCertPath, 'utf-8'));
    } else {
      // Try embedded watermark
      cert = parseCertFromSQL(fileContent);
    }
  }
  
  if (!cert) {
    console.error('\n\u274C No certificate found.');
    console.error('   Provide a certificate file with --cert <file>');
    console.error('   Or the dataset must contain an embedded _realitydb_meta table.\n');
    process.exit(1);
  }
  
  console.log('\n\u{1F50D} Verifying ' + file + '...');
  console.log('\u2500'.repeat(50));
  
  const results: { check: string; passed: boolean; detail: string }[] = [];
  
  // 1. Signature verification
  const sigResult = verifyCertificate(cert, options.publicKey);
  results.push({ check: 'Signature', passed: sigResult.valid, detail: sigResult.reason });
  
  // 2. Content integrity
  // Strip watermark before hashing for comparison
  const cleanContent = fileContent.replace(/\n-- =+\n-- REALITYDB[\s\S]*$/, '');
  const integrityResult = verifyContentIntegrity(cert, cleanContent);
  results.push({ check: 'Content hash', passed: integrityResult.valid, detail: integrityResult.reason });
  
  // 3. Claims validation
  results.push({ check: 'Generator', passed: cert.claims.generator === 'realitydb-cli', detail: 'Generator: ' + cert.claims.generator });
  results.push({ check: 'Key ID', passed: cert.key_id === 'realitydb-2026', detail: 'Key: ' + cert.key_id });
  
  // 4. Compliance assertions
  if (cert.claims.compliance_assertions) {
    const ca = cert.claims.compliance_assertions;
    if (ca.pii_masked === true) {
      results.push({ check: 'PII masked', passed: true, detail: 'PII masking confirmed' });
    }
    if (ca.k_anonymity !== undefined) {
      results.push({ check: 'k-anonymity', passed: ca.k_anonymity >= 5, detail: 'k-anonymity: ' + ca.k_anonymity });
    }
  }
  
  if (options.json) {
    console.log(JSON.stringify({ file, results, certificate: cert }, null, 2));
    process.exit(results.every(r => r.passed) ? 0 : 1);
  }
  
  // Display results
  for (const r of results) {
    const icon = r.passed ? '\u2705' : '\u274C';
    console.log('   ' + icon + ' ' + r.check + ': ' + r.detail);
  }
  
  const allPassed = results.every(r => r.passed);
  
  console.log('\u2500'.repeat(50));
  if (allPassed) {
    console.log('\u{1F510} Dataset is certified by RealityDB.');
    console.log('   Issued:    ' + cert.claims.generated_at);
    console.log('   Template:  ' + cert.claims.template);
    console.log('   Rows:      ' + cert.claims.total_rows?.toLocaleString());
    console.log('   Signed by: ' + cert.claims.generator + ' v' + cert.claims.version);
  } else {
    console.log('\u26A0\uFE0F  Verification failed. ' + results.filter(r => !r.passed).length + ' check(s) did not pass.');
  }
  console.log('');
  
  process.exit(allPassed ? 0 : 1);
}
