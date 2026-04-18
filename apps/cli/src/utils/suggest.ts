// ============================================================
// suggestNext() — Contextual Command Suggestion Engine
//
// Every RealityDB command calls this at the end of its output.
// Suggestions are state-aware: they change based on what the
// command found, not a static help menu.
//
// Design docs:
//   realitydb-internal/DEVELOPER-WIZARD-DESIGN.md
//   realitydb-internal/CLI-PREMIUM-FIRST-EXPERIENCE.md
//   realitydb-internal/CLI-EXIT-STRATEGY-DESIGN.md
// ============================================================

interface SuggestContext {
  command: 'scan:infer' | 'doctor' | 'run' | 'assess' | 'profile' | 'pii-scan' | 'diff' | 'comply-report' | 'certify' | 'verify';
  outputFile?: string;
  packFile?: string;
  reviewFile?: string;
  score?: number;
  fidelityScore?: number;
  structureScore?: number;
  privacyScore?: number;
  piiCount?: number;
  tier3Count?: number;
  tier2Count?: number;
  breakingChanges?: number;
  cosmeticChanges?: number;
  rowCount?: number;
  tableCount?: number;
  fkCount?: number;
  lifecycleCount?: number;
  temporalCount?: number;
  fixedCount?: number;
  framework?: string;
  verified?: boolean;
  tampered?: boolean;
  skewedColumns?: number;
  temporalViolations?: number;
}

export function suggestNext(ctx: SuggestContext): void {
  const sep = '─'.repeat(50);
  const suggestions: string[] = [];
  let primaryMessage = '';
  let gateMessage = '';

  switch (ctx.command) {
    // ========================================================
    // SCAN:INFER
    // ========================================================
    case 'scan:infer': {
      if (ctx.tier3Count && ctx.tier3Count > 0) {
        primaryMessage = `   ⚠️  ${ctx.tier3Count} column(s) need your input — open REVIEW.md first`;
      } else {
        primaryMessage = `   ✅ All columns auto-inferred — ready to generate`;
      }

      suggestions.push(`   1. Review: ${ctx.reviewFile ? `notepad ${basename(ctx.reviewFile)}` : 'Open REVIEW.md'}`);
      if (ctx.packFile) {
        suggestions.push(`   2. realitydb doctor --pack ${basename(ctx.packFile)} --fix`);
        suggestions.push(`   3. realitydb run --pack ${basename(ctx.packFile)} --rows 100 --format sql`);
      }
      break;
    }

    // ========================================================
    // DOCTOR
    // ========================================================
    case 'doctor': {
      if (ctx.fixedCount && ctx.fixedCount > 0) {
        primaryMessage = `   ✅ ${ctx.fixedCount} issue(s) auto-fixed. Ready to generate.`;
      } else {
        primaryMessage = `   ✅ Pack is valid. Generate your first sample.`;
      }

      if (ctx.packFile) {
        suggestions.push(`   1. realitydb run --pack ${basename(ctx.packFile)} --rows 100 --format sql`);
        suggestions.push(`   2. realitydb explain --pack ${basename(ctx.packFile)} --rows 1000`);
      }
      break;
    }

    // ========================================================
    // RUN
    // ========================================================
    case 'run': {
      const file = ctx.outputFile ? basename(ctx.outputFile) : '<output>';

      if (ctx.rowCount && ctx.rowCount < 1000) {
        primaryMessage = `   💡 Sample generated. Run assess to check quality before scaling up.`;
      } else {
        primaryMessage = `   💡 Dataset generated. Run comply report for audit documentation.`;
      }

      suggestions.push(`   1. realitydb assess ${file}`);
      suggestions.push(`   2. realitydb profile ${file}`);
      suggestions.push(`   3. realitydb pii-scan ${file}`);

      if (ctx.rowCount && ctx.rowCount < 1000 && ctx.packFile) {
        suggestions.push(`   4. realitydb run --pack ${basename(ctx.packFile)} --rows 5000   Scale up`);
      }

      gateMessage = `   💡 Free tier: up to 10K rows per generation\n      Need more? realitydb.dev/pricing`;
      break;
    }

    // ========================================================
    // ASSESS
    // ========================================================
    case 'assess': {
      const file = ctx.outputFile ? basename(ctx.outputFile) : '<file>';

      if (ctx.score !== undefined) {
        if (ctx.score >= 90) {
          primaryMessage = `   🟢 Quality excellent. Scale up or generate compliance report.`;
          suggestions.push(`   1. realitydb comply report --file ${file} --framework hipaa`);
          suggestions.push(`   2. realitydb certify ${file} --embed`);
          if (ctx.packFile) {
            suggestions.push(`   3. realitydb run --pack ${basename(ctx.packFile)} --rows 5000   Scale up`);
          }
        } else if (ctx.score >= 70) {
          primaryMessage = `   🟡 Review flagged metrics. Tune pack and re-assess.`;
          suggestions.push(`   1. realitydb profile ${file}`);
          if (ctx.packFile) {
            suggestions.push(`   2. Edit ${basename(ctx.packFile)}, then re-run + re-assess`);
          }
          suggestions.push(`   3. realitydb comply report --file ${file} --framework hipaa`);
        } else {
          primaryMessage = `   🔴 Quality needs work. Review pack and re-generate.`;
          if (ctx.packFile) {
            suggestions.push(`   1. realitydb doctor --pack ${basename(ctx.packFile)} --fix`);
            suggestions.push(`   2. Edit ${basename(ctx.packFile)} to fix flagged metrics`);
          }
          suggestions.push(`   3. realitydb profile ${file}`);
        }
      }

      if (ctx.piiCount && ctx.piiCount > 0) {
        suggestions.push(`   ⚠️  ${ctx.piiCount} PII column(s) found. Run: realitydb pii-scan ${file} --tier full`);
      }

      if (ctx.temporalViolations && ctx.temporalViolations > 0) {
        suggestions.push(`   ⚠️  Temporal ordering issues. Check lifecycle rules in pack.`);
      }

      gateMessage = `   💡 Free: 3 assessments/month, up to 100K rows\n      Professional: unlimited — realitydb.dev/pricing`;
      break;
    }

    // ========================================================
    // PROFILE
    // ========================================================
    case 'profile': {
      const file = ctx.outputFile ? basename(ctx.outputFile) : '<file>';

      if (ctx.skewedColumns && ctx.skewedColumns > 0) {
        primaryMessage = `   ⚠️  ${ctx.skewedColumns} column(s) show skewed distribution. Review enum weights.`;
      } else {
        primaryMessage = `   ✅ Distributions look healthy. Run assess for full quality score.`;
      }

      suggestions.push(`   1. realitydb assess ${file}`);
      suggestions.push(`   2. realitydb diff old.sql ${file}`);
      if (ctx.packFile) {
        suggestions.push(`   3. Edit ${basename(ctx.packFile)} to adjust distributions`);
      }
      break;
    }

    // ========================================================
    // PII-SCAN
    // ========================================================
    case 'pii-scan': {
      const file = ctx.outputFile ? basename(ctx.outputFile) : '<file>';

      if (ctx.piiCount && ctx.piiCount > 0) {
        primaryMessage = `   🛡️  Consider: realitydb run --pack <template> for PII-free synthetic data`;
        suggestions.push(`   1. realitydb assess ${file}`);
        suggestions.push(`   2. realitydb comply report --file ${file} --framework hipaa`);
      } else {
        primaryMessage = `   ✅ No PII patterns detected.`;
        suggestions.push(`   1. realitydb assess ${file}`);
        suggestions.push(`   2. realitydb certify ${file} --embed`);
      }

      gateMessage = `   🔓 Full scan: 46 patterns + HIPAA 18 — realitydb pii-scan ${file} --tier full\n      realitydb.dev/pricing`;
      break;
    }

    // ========================================================
    // DIFF
    // ========================================================
    case 'diff': {
      const file = ctx.outputFile ? basename(ctx.outputFile) : '<right-file>';

      if (ctx.breakingChanges && ctx.breakingChanges > 0) {
        primaryMessage = `   🔴 ${ctx.breakingChanges} breaking change(s). Review before deploying.`;
        suggestions.push(`   1. Review breaking changes above`);
        suggestions.push(`   2. realitydb assess ${file}`);
        suggestions.push(`   3. realitydb profile ${file}`);
      } else {
        primaryMessage = `   ✅ No breaking changes. ${ctx.cosmeticChanges || 0} cosmetic difference(s).`;
        suggestions.push(`   1. realitydb certify ${file} --embed`);
        suggestions.push(`   2. realitydb comply report --file ${file} --framework hipaa`);
      }
      break;
    }

    // ========================================================
    // COMPLY REPORT
    // ========================================================
    case 'comply-report': {
      const file = ctx.outputFile ? basename(ctx.outputFile) : '<file>';

      if (ctx.score !== undefined && ctx.score >= 90) {
        primaryMessage = `   📄 Report ready. Certify the dataset for distribution.`;
        suggestions.push(`   1. realitydb certify ${file.replace(/-\w+-report\.html$/, '')} --embed`);
        if (ctx.packFile) {
          suggestions.push(`   2. realitydb run --pack ${basename(ctx.packFile)} --rows 10000   Scale up`);
        }
      } else {
        primaryMessage = `   ⚠️  Review report findings. Address issues and re-generate.`;
        suggestions.push(`   1. realitydb assess ${file.replace(/-\w+-report\.html$/, '')}`);
        if (ctx.packFile) {
          suggestions.push(`   2. Edit ${basename(ctx.packFile)}, re-generate, re-assess`);
        }
      }
      break;
    }

    // ========================================================
    // CERTIFY
    // ========================================================
    case 'certify': {
      const file = ctx.outputFile ? basename(ctx.outputFile) : '<file>';
      primaryMessage = `   ✅ Dataset certified. Verify anytime with realitydb verify.`;
      suggestions.push(`   1. realitydb verify ${file}`);
      suggestions.push(`   2. realitydb diff v1.sql ${file}   Track changes`);
      suggestions.push(`   3. Share ${file} + .realitydb-cert.json`);

      gateMessage = `   💡 Ed25519 cryptographic signatures available\n      realitydb.dev/pricing`;
      break;
    }

    // ========================================================
    // VERIFY
    // ========================================================
    case 'verify': {
      const file = ctx.outputFile ? basename(ctx.outputFile) : '<file>';

      if (ctx.verified && !ctx.tampered) {
        primaryMessage = `   ✅ Dataset is authentic and untampered.`;
        suggestions.push(`   1. realitydb profile ${file}`);
        suggestions.push(`   2. realitydb comply report --file ${file} --framework hipaa`);
      } else if (ctx.tampered) {
        primaryMessage = `   ❌ Dataset was modified after certification.`;
        suggestions.push(`   1. realitydb certify ${file} --embed   Re-certify`);
        suggestions.push(`   2. realitydb diff original.sql ${file}   See what changed`);
      }
      break;
    }
  }

  // Print the suggestion block
  console.log(`\n${sep}`);
  if (primaryMessage) console.log(primaryMessage);
  console.log();

  if (suggestions.length > 0) {
    console.log(`   Next steps:\n`);
    for (const s of suggestions) {
      console.log(s);
    }
  }

  if (gateMessage) {
    console.log();
    console.log(gateMessage);
  }

  // Always show exit paths
  console.log();
  console.log(`   ℹ  realitydb --help          Full command list`);
  console.log(`   ℹ  realitydb menu            Interactive browser`);
  console.log(`   ↗  realitydb.dev/docs        Documentation`);
  console.log(`${sep}\n`);
}

function basename(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || filePath;
}
