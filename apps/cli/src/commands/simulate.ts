import {
  simulateRun,
  simulateWebhooks,
  simulateProfiles,
} from '@databox/core';
import {
  formatSimulationReport,
  formatSimulationReportCI,
} from '@databox/generators';
import { formatCIOutput } from '@databox/shared';

const VERSION = '1.3.0';

export async function simulateRunCommand(options: {
  profile?: string;
  duration?: string;
  events?: string;
  seed?: string;
  output?: string;
  format?: string;
  ci?: boolean;
}): Promise<void> {
  const start = performance.now();
  try {
    const events = options.events ? parseInt(options.events, 10) : 1000;
    const seed = options.seed ? parseInt(options.seed, 10) : undefined;
    const format = (options.format ?? 'json') as 'json' | 'ndjson';

    if (!options.ci) {
      console.log('');
      console.log('RealityDB Simulate');
      console.log('═══════════════════════════════════════');
      console.log(`Profile: ${options.profile ?? 'saas-startup'}`);
      if (options.duration) console.log(`Duration: ${options.duration}`);
      console.log(`Events: ${events}`);
      if (seed !== undefined) console.log(`Seed: ${seed}`);
      if (options.output) console.log(`Output: ${options.output} (${format})`);
      console.log('');
      console.log('Generating event stream...');
    }

    const result = simulateRun({
      profile: options.profile,
      duration: options.duration,
      events,
      seed,
      output: options.output,
      format,
    });

    const durationMs = Math.round(performance.now() - start);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'simulate run',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: {
          ...formatSimulationReportCI(result.report),
          outputFile: result.outputFile ?? null,
        },
      }));
      return;
    }

    console.log(formatSimulationReport(result.report));

    if (result.outputFile) {
      console.log(`Events written to: ${result.outputFile}`);
      console.log('');
    }

    const totalTime = (durationMs / 1000).toFixed(1);
    console.log(`Simulation complete in ${totalTime}s`);
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'simulate run',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: message,
      }));
      process.exit(1);
    }
    console.error(`[realitydb] Simulate failed: ${message}`);
    process.exit(1);
  }
}

export async function simulateProfilesCommand(options: {
  ci?: boolean;
}): Promise<void> {
  const start = performance.now();
  try {
    const profiles = simulateProfiles();
    const durationMs = Math.round(performance.now() - start);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'simulate profiles',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: {
          profiles: profiles.map((p) => ({
            name: p.name,
            description: p.description,
            duration: p.duration,
            trafficPattern: p.trafficPattern,
            eventSources: p.eventSources.length,
            correlationRules: p.correlationRules.length,
          })),
        },
      }));
      return;
    }

    console.log('');
    console.log('RealityDB Simulate — Profiles');
    console.log('═══════════════════════════════════════');
    console.log('');
    for (const profile of profiles) {
      console.log(`  ${profile.name}`);
      console.log(`    ${profile.description}`);
      console.log(`    Duration: ${profile.duration} | Traffic: ${profile.trafficPattern} | Sources: ${profile.eventSources.length} | Rules: ${profile.correlationRules.length}`);
      console.log('');
    }
    console.log('Run a simulation:');
    console.log('  realitydb simulate run --profile saas-startup --events 1000 --output events.json');
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'simulate profiles',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: message,
      }));
      process.exit(1);
    }
    console.error(`[realitydb] ${message}`);
    process.exit(1);
  }
}

export async function simulateWebhooksCommand(options: {
  source?: string;
  events?: string;
  seed?: string;
  output?: string;
  format?: string;
  ci?: boolean;
}): Promise<void> {
  const start = performance.now();
  try {
    const source = (options.source ?? 'stripe') as 'stripe' | 'github';
    const events = options.events ? parseInt(options.events, 10) : 100;
    const seed = options.seed ? parseInt(options.seed, 10) : undefined;
    const format = (options.format ?? 'json') as 'json' | 'ndjson';

    if (!['stripe', 'github'].includes(source)) {
      const msg = `Invalid webhook source "${source}". Use: stripe, github`;
      if (options.ci) {
        console.log(formatCIOutput({
          success: false,
          command: 'simulate webhooks',
          version: VERSION,
          timestamp: new Date().toISOString(),
          durationMs: Math.round(performance.now() - start),
          error: msg,
        }));
        process.exit(1);
      }
      console.error(`[realitydb] ${msg}`);
      process.exit(1);
    }

    if (!options.ci) {
      console.log('');
      console.log('RealityDB Simulate — Webhooks');
      console.log('═══════════════════════════════════════');
      console.log(`Source: ${source}`);
      console.log(`Events: ${events}`);
      if (seed !== undefined) console.log(`Seed: ${seed}`);
      if (options.output) console.log(`Output: ${options.output} (${format})`);
      console.log('');
      console.log(`Generating ${source} webhooks...`);
    }

    const result = simulateWebhooks({
      source,
      events,
      seed,
      output: options.output,
      format,
    });

    const durationMs = Math.round(performance.now() - start);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'simulate webhooks',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: {
          source,
          ...formatSimulationReportCI(result.report),
          outputFile: result.outputFile ?? null,
        },
      }));
      return;
    }

    console.log(formatSimulationReport(result.report));

    if (result.outputFile) {
      console.log(`Webhooks written to: ${result.outputFile}`);
      console.log('');
    }

    const totalTime = (durationMs / 1000).toFixed(1);
    console.log(`Webhook generation complete in ${totalTime}s`);
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'simulate webhooks',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: message,
      }));
      process.exit(1);
    }
    console.error(`[realitydb] Simulate webhooks failed: ${message}`);
    process.exit(1);
  }
}
