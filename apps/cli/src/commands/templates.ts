import { getDefaultRegistry } from '@databox/templates';

export function templatesCommand(): void {
  const registry = getDefaultRegistry();
  const templates = registry.list();

  if (templates.length === 0) {
    console.log('No templates registered.');
    return;
  }

  console.log('');
  console.log('Available Templates:');
  for (const template of templates) {
    console.log(`  ${template.name} (v${template.version}) — ${template.description}`);
    console.log(`    Targets: ${template.targetTables.join(', ')}`);
  }
  console.log('');
}
