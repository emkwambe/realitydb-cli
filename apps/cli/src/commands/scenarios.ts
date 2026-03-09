import { getDefaultScenarioRegistry } from '@databox/core';

export function scenariosCommand(): void {
  const registry = getDefaultScenarioRegistry();
  const scenarios = registry.list();

  console.log('');
  console.log('Available Scenarios:');
  for (const s of scenarios) {
    console.log(`  ${s.name} — ${s.description} (${s.supportedIntensities.join(', ')})`);
  }
  console.log('');
}
