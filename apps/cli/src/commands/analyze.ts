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
}): Promise<void> {
  const start = performance.now();
  try {
    const config = await loadConfig(options.configPath);
    const sampleSize = options.sampleSize ? parseInt(options.sampleSize, 10) : 1000;
    const masked = maskConnectionString(config.database.connectionString);

    if (!options.ci) {
      console.log('');
      console.log('RealityDB Analyze');
      console.log('═══════════════════════════════════════');
      console.log(`Database: ${masked}`);
      console.log(`Sample size: ${sampleSize} rows per table`);
      if (options.output) {
        console.log(`Output: ${options.output}`);
      }
      console.log('');
      console.log('Analyzing schema...');
    }

    const result = await analyzeDatabase(config, {
      sampleSize,
      output: options.output,
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
          templateGenerated: !!options.output,
          templateFile: options.output ?? null,
        },
      }));
      if (result.templateJson && options.output) {
        const filePath = resolve(options.output);
        writeFileSync(filePath, result.templateJson + '\n', 'utf-8');
      }
      return;
    }

    // Print analysis report
    console.log(formatAnalysisReport(result.report));

    // Write template file if requested
    if (result.templateJson && options.output) {
      const filePath = resolve(options.output);
      writeFileSync(filePath, result.templateJson + '\n', 'utf-8');
      console.log('───────────────────────────────────────');
      console.log(`Template generated: ${filePath}`);
      console.log('');
      console.log('Use it with:');
      console.log(`  realitydb seed --template "${filePath}"`);
      console.log('');
      console.log('Validate it with:');
      console.log(`  realitydb templates validate "${filePath}"`);
    } else if (!options.output) {
      console.log('───────────────────────────────────────');
      console.log('To generate a template from this analysis:');
      console.log('  realitydb analyze --output my-template.json');
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
