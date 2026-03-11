import { getDefaultRegistry } from '@databox/templates';
import { formatCIOutput } from '@databox/shared';

const VERSION = '0.9.0';

interface DemoPack {
  name: string;
  template: string;
  persona: string;
  approxRows: number;
}

const DEMO_PACKS: DemoPack[] = [
  { name: 'saas-startup', template: 'saas', persona: 'startup', approxRows: 200 },
  { name: 'saas-growth', template: 'saas', persona: 'growth', approxRows: 2000 },
  { name: 'ecommerce-growth', template: 'ecommerce', persona: 'growth', approxRows: 2000 },
  { name: 'fintech-growth', template: 'fintech', persona: 'growth', approxRows: 2000 },
  { name: 'healthcare-growth', template: 'healthcare', persona: 'growth', approxRows: 2000 },
];

export function packsListCommand(options: { ci?: boolean }): void {
  const start = performance.now();
  const registry = getDefaultRegistry();
  const available = DEMO_PACKS.filter((p) => registry.get(p.template));

  if (options.ci) {
    console.log(formatCIOutput({
      success: true,
      command: 'packs list',
      version: VERSION,
      timestamp: new Date().toISOString(),
      durationMs: Math.round(performance.now() - start),
      data: {
        packs: available.map((p) => ({
          name: p.name,
          template: p.template,
          persona: p.persona,
          approxRows: p.approxRows,
        })),
      },
    }));
    return;
  }

  console.log('');
  console.log('Available Demo Packs:');
  for (const pack of available) {
    const label = `${pack.template} demo (${pack.persona})`;
    const rows = `~${pack.approxRows} rows`;
    console.log(`  ${pack.name.padEnd(22)} ${label.padEnd(30)} ${rows}`);
  }
  console.log('');
  console.log('Generate a demo pack:');
  console.log('  realitydb seed --template saas --records 200 --seed 42');
  console.log('');
}
