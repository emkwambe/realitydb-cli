import { shareRealityPack } from '@databox/core';
import { formatCIOutput } from '@databox/shared';

const VERSION = '0.3.0';

export async function shareCommand(
  filePath: string,
  options: { ci?: boolean },
): Promise<void> {
  const start = performance.now();
  try {
    if (!filePath) {
      const msg = 'Missing file path argument.';
      if (options.ci) {
        console.log(formatCIOutput({
          success: false,
          command: 'share',
          version: VERSION,
          timestamp: new Date().toISOString(),
          durationMs: 0,
          error: msg,
        }));
        process.exit(1);
      }
      console.error(`[realitydb] ${msg}`);
      console.error('Usage: realitydb share <file>');
      process.exit(1);
    }

    const result = await shareRealityPack(filePath);
    const durationMs = Math.round(performance.now() - start);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'share',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: {
          method: result.method,
          location: result.location,
          packName: result.packName,
          size: result.size,
          tableCount: result.tableCount,
          totalRows: result.totalRows,
        },
      }));
      return;
    }

    console.log('');
    console.log('RealityDB Share');
    console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
    console.log(`Pack: ${result.packName} (${result.tableCount} tables, ${result.totalRows} rows, ${result.size})`);
    console.log('');
    console.log('Share this file:');
    console.log(`  File: ${result.location}`);
    console.log(`  Size: ${result.size}`);
    console.log('');
    console.log('The receiver can load it with:');
    console.log(`  realitydb load ${result.location} --confirm`);
    console.log('');
    console.log('Tip: To create the schema first, the receiver can run:');
    console.log(`  realitydb load ${result.location} --show-ddl`);
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'share',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: message,
      }));
      process.exit(1);
    }
    console.error(`[realitydb] Share failed: ${message}`);
    process.exit(1);
  }
}
