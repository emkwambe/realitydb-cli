import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '@databox/config';
import { analyzeDatabase, formatAnalysisReport, formatAnalysisReportCI } from '@databox/core';
import { formatCIOutput } from '@databox/shared';
import { maskConnectionString } from '../utils.js';

const VERSION = '1.3.1';

export async function analyzeCommand(options: {
  output?: string;
  sampleSize?: string;
  ci?: boolean;
  configPath?: string;
  unsafeAnalyze?: boolean;
  autoTemplate?: boolean;
}): Promise<void> {
  const start = performance.now();
  try {
    const config = await loadConfig(options.configPath);
    const sampleSize = options.sampleSize ? parseInt(options.sampleSize, 10) : 1000;
    const masked = maskConnectionString(config.database.connectionString);
    const safeMode = !options.unsafeAnalyze;
    const autoTemplate = options.autoTemplate ?? false;
    const outputPath = options.output ?? (autoTemplate ? './realitydb-template.json' : undefined);

    if (!options.ci) {
      console.log('');
      console.log('RealityDB Schema Analysis');
      console.log('═══════════════════════════════════════');
      console.log(`Database: ${masked}`);
      console.log(`Sample size: ${sampleSize} rows per table`);
      if (outputPath) {
        console.log(`Output: ${outputPath}`);
      }
      console.log('');
      console.log('Analyzing schema...');
    }

    const result = await analyzeDatabase(config, {
      sampleSize,
      output: outputPath,
      safeMode,
      autoTemplate,
    });

    const durationMs = Math.round(performance.now() - start);

    if (options.ci) {
      const ciData = formatAnalysisReportCI(result.report);
      console.log(formatCIOutput({
        success: true,
        command: 'analyze',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: {
          ...ciData,
          confidenceBreakdown: result.confidenceBreakdown,
          sanitizationReport: result.sanitizationReport ?? null,
          templateGenerated: !!outputPath,
          templateFile: outputPath ?? null,
        },
      }));
      if (result.templateJson && outputPath) {
        const filePath = resolve(outputPath);
        writeFileSync(filePath, result.templateJson + '\n', 'utf-8');
      }
      return;
    }

    // Print analysis report
    console.log(formatAnalysisReport(result.report));

    // Print confidence breakdown
    const total = result.confidenceBreakdown.high + result.confidenceBreakdown.medium + result.confidenceBreakdown.low;
    if (total > 0) {
      console.log('Analysis Summary:');
      const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
      console.log(`  High confidence:   ${result.confidenceBreakdown.high} columns (${pct(result.confidenceBreakdown.high)}%)`);
      console.log(`  Medium confidence:  ${result.confidenceBreakdown.medium} columns (${pct(result.confidenceBreakdown.medium)}%)`);
      console.log(`  Low confidence:     ${result.confidenceBreakdown.low} columns (${pct(result.confidenceBreakdown.low)}%)`);
      console.log('');
    }

    // Print sanitization report
    if (safeMode && result.sanitizationReport) {
      const sr = result.sanitizationReport;
      console.log('PII Sanitization: ENABLED');
      console.log(`  Values scanned:     ${sr.totalScanned.toLocaleString()}`);
      console.log(`  PII detected:       ${sr.totalDetections} instances`);
      if (Object.keys(sr.byCategory).length > 0) {
        const cats = Object.entries(sr.byCategory)
          .map(([k, v]) => `${k} (${v})`)
          .join(', ');
        console.log(`  Categories:         ${cats}`);
      }
      console.log('');
    } else if (!safeMode) {
      console.log('PII Sanitization: DISABLED (--unsafe-analyze)');
      console.log('  Warning: Sample values were NOT sanitized. Do not use on production databases.');
      console.log('');
    }

    // Write template file if requested
    if (result.templateJson && outputPath) {
      const filePath = resolve(outputPath);
      writeFileSync(filePath, result.templateJson + '\n', 'utf-8');
      console.log('───────────────────────────────────────');
      console.log(`Template generated: ${filePath}`);
      console.log('');
      console.log('Use it with:');
      console.log(`  realitydb seed --template "${filePath}"`);
      console.log('');
      console.log('Validate it with:');
      console.log(`  realitydb templates validate "${filePath}"`);
    } else if (!outputPath) {
      console.log('───────────────────────────────────────');
      console.log('To generate a template from this analysis:');
      console.log('  realitydb analyze --output my-template.json');
      console.log('  realitydb analyze --auto-template');
    }

    const totalTime = (durationMs / 1000).toFixed(1);
    console.log('');
    console.log(`Analysis complete in ${totalTime}s`);
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'analyze',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: message,
      }));
      process.exit(1);
    }
    if (message.includes('Config file not found')) {
      console.error(`[realitydb] ${message}`);
      console.error('Hint: Create a realitydb.config.json with your database connection');
    } else if (message.includes('connection') || message.includes('ECONNREFUSED')) {
      console.error(`[realitydb] Analyze failed: ${message}`);
      console.error('Hint: Check that your database is running');
    } else {
      console.error(`[realitydb] Analyze failed: ${message}`);
    }
    process.exit(1);
  }
}
