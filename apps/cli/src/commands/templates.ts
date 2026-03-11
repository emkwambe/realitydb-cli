import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import {
  getDefaultRegistry,
  listUserTemplates,
  validateTemplateJSON,
  loadTemplateFromJSON,
} from '@databox/templates';
import { formatCIOutput } from '@databox/shared';

const VERSION = '0.5.0';

export function templatesCommand(): void {
  const registry = getDefaultRegistry();
  const builtIn = registry.list();
  const userTemplates = listUserTemplates();

  console.log('');
  console.log('Built-in Templates:');
  if (builtIn.length === 0) {
    console.log('  (none)');
  } else {
    for (const template of builtIn) {
      console.log(`  ${template.name} (v${template.version}) — ${template.description}`);
      console.log(`    Targets: ${template.targetTables.join(', ')}`);
    }
  }

  if (userTemplates.length > 0) {
    console.log('');
    console.log('User Templates (~/.realitydb/templates/):');
    for (const t of userTemplates) {
      console.log(`  ${t.name} — ${t.filePath}`);
    }
  }
  console.log('');
}

export function templatesInitCommand(): void {
  const fileName = 'realitydb.template.json';

  if (existsSync(fileName)) {
    console.error(`[realitydb] ${fileName} already exists in this directory.`);
    process.exit(1);
  }

  const scaffold = {
    name: 'my-template',
    version: '1.0',
    description: 'Custom domain template for my application',
    tables: {
      users: {
        match: ['users', '*user*'],
        columns: {
          email: {
            strategy: 'email',
          },
          full_name: {
            match: ['full_name', 'name', 'display_name'],
            strategy: 'full_name',
          },
          status: {
            strategy: 'enum',
            options: {
              values: ['active', 'inactive', 'suspended'],
              weights: [0.80, 0.15, 0.05],
            },
          },
          created_at: {
            strategy: 'timestamp',
            options: { mode: 'past' },
          },
        },
      },
    },
  };

  writeFileSync(fileName, JSON.stringify(scaffold, null, 2) + '\n');

  console.log('');
  console.log(`Created ${fileName}`);
  console.log('Edit this file to define your custom template.');
  console.log('');
  console.log('Then run:');
  console.log(`  realitydb seed --template ./${fileName}`);
  console.log('');
}

export function templatesValidateCommand(filePath: string, options: { ci?: boolean }): void {
  const start = performance.now();

  if (!existsSync(filePath)) {
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'templates validate',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: `File not found: ${filePath}`,
      }));
      process.exit(1);
    }
    console.error(`[realitydb] File not found: ${filePath}`);
    process.exit(1);
  }

  let json: unknown;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    json = JSON.parse(raw);
  } catch {
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'templates validate',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: `File is not valid JSON: ${filePath}`,
      }));
      process.exit(1);
    }
    console.error(`[realitydb] File is not valid JSON: ${filePath}`);
    process.exit(1);
  }

  const result = validateTemplateJSON(json);
  const durationMs = Math.round(performance.now() - start);

  if (options.ci) {
    console.log(formatCIOutput({
      success: result.valid,
      command: 'templates validate',
      version: VERSION,
      timestamp: new Date().toISOString(),
      durationMs,
      data: {
        file: filePath,
        valid: result.valid,
        errors: result.errors,
      },
      error: result.valid ? undefined : `${result.errors.length} validation error(s)`,
    }));
    if (!result.valid) {
      process.exit(1);
    }
    return;
  }

  if (result.valid) {
    try {
      const template = loadTemplateFromJSON(filePath);
      console.log('');
      console.log(`Template "${template.name}" (v${template.version}) is valid.`);
      console.log(`  ${template.description}`);
      console.log(`  Tables: ${template.targetTables.join(', ')}`);
      console.log('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[realitydb] Template file is valid JSON but failed to load: ${msg}`);
      process.exit(1);
    }
  } else {
    console.error('');
    console.error(`Template validation failed (${result.errors.length} error(s)):`);
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    console.error('');
    process.exit(1);
  }
}
