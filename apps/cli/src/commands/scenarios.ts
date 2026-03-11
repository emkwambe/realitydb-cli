import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getDefaultScenarioRegistry, scaffoldCustomScenario } from '@databox/core';

export function scenariosCommand(): void {
  const registry = getDefaultScenarioRegistry();
  const scenarios = registry.list();

  console.log('');
  console.log('Available Scenarios:');
  for (const s of scenarios) {
    console.log(`  ${s.name} — ${s.description} (${s.supportedIntensities.join(', ')})`);
  }
  console.log('');
  console.log('Compose multiple: --scenario "fraud-spike,payment-failures"');
  console.log('Schedule on timeline: --scenario-schedule "fraud-spike:month-6,churn-spike:month-9"');
  console.log('Create custom: realitydb scenarios create my-scenario');
  console.log('');
}

export function scenariosCreateCommand(name: string): void {
  if (!name || name.trim().length === 0) {
    console.error('[realitydb] Please provide a scenario name.');
    console.error('Usage: realitydb scenarios create <name>');
    process.exit(1);
  }

  const sanitized = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const fileName = `${sanitized}.scenario.json`;
  const filePath = resolve(fileName);

  if (existsSync(filePath)) {
    console.error(`[realitydb] File already exists: ${fileName}`);
    process.exit(1);
  }

  const scaffold = scaffoldCustomScenario(sanitized);
  writeFileSync(filePath, JSON.stringify(scaffold, null, 2) + '\n', 'utf-8');

  console.log('');
  console.log(`Created custom scenario: ${fileName}`);
  console.log('');
  console.log('Edit the file to define your scenario rules, then use it with:');
  console.log(`  realitydb seed --scenario "${filePath}"`);
  console.log('');
  console.log('Scenario JSON format:');
  console.log('  name             — Unique scenario identifier');
  console.log('  description      — Human-readable description');
  console.log('  targetTablePatterns — Tables to target (e.g., ["*order*", "*payment*"])');
  console.log('  rules            — Array of modification rules:');
  console.log('    column         — Column to modify ("*" for any non-ID column)');
  console.log('    action         — "set_null" | "set_value" | "inject_error" | "duplicate_row"');
  console.log('    value          — Value for set_value action');
  console.log('    errorValues    — Array of error values for inject_error');
  console.log('    rates          — Per-intensity rates: { low: 0.02, medium: 0.05, high: 0.10 }');
  console.log('');
}
