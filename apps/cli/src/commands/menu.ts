import * as readline from 'readline';

const GROUPS = [
  {
    name: 'Account & Settings',
    icon: '\u2699\uFE0F',
    commands: [
      { name: 'login', desc: 'Authenticate with RealityDB' },
      { name: 'logout', desc: 'End current session' },
      { name: 'status', desc: 'Show current tier, usage, and limits' },
      { name: 'upgrade', desc: 'Upgrade to Core/Enterprise (opens Stripe)' },
    ],
  },
  {
    name: 'Schema & Discovery',
    icon: '\u{1F50D}',
    commands: [
      { name: 'scan', desc: 'Scan a database and generate a template', example: 'realitydb scan --connection "postgresql://..." --infer-enums --detect-pii -o template.json' },
      { name: 'analyze', desc: 'Analyze live data for optimal strategies', example: 'realitydb analyze --connection "postgresql://..." -o analysis.json' },
      { name: 'explain', desc: 'Preview row distribution without generating', example: 'realitydb explain --pack template.json --rows 10000' },
      { name: 'benchmark', desc: 'Measure generation speed + memory', example: 'realitydb benchmark --pack template.json --rows 50000 --tables' },
    ],
  },
  {
    name: 'Rules & Tuning',
    icon: '\u{1F527}',
    commands: [
      { name: 'tune', desc: 'Adjust enum weights (preview or apply)', example: 'realitydb tune --pack template.json --table orders --column status --values "active:85,closed:15"' },
      { name: 'add', desc: 'Add lifecycle or temporal rules', example: 'realitydb add --pack template.json --table orders --column status --trigger cancelled --nullify shipped_at' },
      { name: 'rule:list', desc: 'Inspect all rules and weighted enums', example: 'realitydb rule:list --pack template.json' },
      { name: 'validate', desc: 'Check pack integrity before generation', example: 'realitydb validate --pack template.json --level strict' },
    ],
  },
  {
    name: 'Generation',
    icon: '\u{1F680}',
    commands: [
      { name: 'run', desc: 'Generate JSON / SQL / CSV / Parquet', example: 'realitydb run --pack template.json --rows 50000 --format sql --drop-tables -o data.sql' },
      { name: 'init', desc: 'Create template from preset (saas, ecommerce, etc.)', example: 'realitydb init --domain saas --quick' },
      { name: 'convert', desc: 'Convert between formats (JSON, CSV, SQL)', example: 'realitydb convert --input data.json --format csv -o output' },
    ],
  },
  {
    name: 'Privacy & Compliance',
    icon: '\u{1F512}',
    commands: [
      { name: 'mask', desc: 'Detect and mask PII in a database', example: 'realitydb mask --connection "postgresql://..." --mode hipaa --dry-run' },
      { name: 'audit', desc: 'View operation history', example: 'realitydb audit --since 2026-04-01' },
      { name: 'audit:export', desc: 'Export audit log with SHA-256 signing', example: 'realitydb audit:export --format json --sign -o audit.json' },
      { name: 'validate --level strict', desc: 'Check for unmasked PII columns', example: 'realitydb validate --pack template.json --level strict' },
    ],
  },
  {
    name: 'ML & Simulation',
    icon: '\u{1F9EA}',
    commands: [
      { name: 'simulate', desc: 'Generate timeline data with scenarios', example: 'realitydb simulate --pack template.json --scenario fraud-spike --timeline 12-months' },
      { name: 'split', desc: 'ML train/test/val splits (3 strategies)', example: 'realitydb split --pack template.json --rows 50000 --strategy temporal -o splits' },
      { name: 'anomaly', desc: 'Inject 8 anomaly types with labels', example: 'realitydb anomaly --pack template.json --inject extreme-value,null-injection --frequency 3 -o anomalies.json' },
    ],
  },
  {
    name: 'Database Operations',
    icon: '\u{1F4BE}',
    commands: [
      { name: 'seed', desc: 'Generate + insert directly into PostgreSQL', example: 'realitydb seed --pack template.json --rows 10000 --connection "postgresql://..." --create-tables --drop-tables' },
      { name: 'reset', desc: 'Drop tables created by seed', example: 'realitydb reset --pack template.json --connection "postgresql://..." --confirm' },
      { name: 'capture', desc: 'Snapshot DB state for bug reproduction', example: 'realitydb capture --name bug-4821 --connection "postgresql://..." --safe' },
      { name: 'load', desc: 'Restore a captured snapshot', example: 'realitydb load bug-4821.realitydb-pack.json --connection "postgresql://..." --confirm' },
    ],
  },
  {
    name: 'Template Management',
    icon: '\u{1F4E6}',
    commands: [
      { name: 'pack', desc: 'List template packs in current directory' },
      { name: 'pack:info', desc: 'Show detailed info about a pack', example: 'realitydb pack:info --pack template.json' },
      { name: 'pack:validate', desc: 'Validate pack file structure', example: 'realitydb pack:validate --pack template.json' },
      { name: 'ci', desc: 'Generate CI/CD config (GitHub/GitLab/CircleCI)', example: 'realitydb ci --platform github --pack template.json --rows 5000' },
    ],
  },
];

const WORKFLOW = `
\u{1F4CB} Recommended Workflow
${'─'.repeat(40)}
   1. \u{1F50D} scan    \u2192 Introspect your database
   2. \u{1F527} tune    \u2192 Adjust enum weights
   3. \u{1F527} add     \u2192 Add lifecycle/temporal rules
   4. \u2705 validate \u2192 Check pack integrity
   5. \u{1F50D} explain \u2192 Preview row distribution
   6. \u{1F680} run     \u2192 Generate data
   7. \u{1F4BE} seed    \u2192 Insert into database
`;

export async function menuCommand(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  const showMainMenu = () => {
    console.log(`\n\u{1F4CB} RealityDB Command Menu`);
    console.log(`${'─'.repeat(40)}\n`);
    GROUPS.forEach((g, i) => {
      console.log(`   ${i + 1}.  ${g.icon}  ${g.name.padEnd(24)} (${g.commands.map(c => c.name).join(', ')})`);
    });
    console.log(`\n   9.  \u{1F4CB}  Recommended Workflow`);
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`   Type a number (1-9) or 'q' to quit.\n`);
  };

  const showGroup = (group: typeof GROUPS[0]) => {
    console.log(`\n${group.icon}  ${group.name}`);
    console.log(`${'─'.repeat(40)}\n`);
    group.commands.forEach((cmd, i) => {
      console.log(`   ${i + 1}. ${cmd.name.padEnd(20)} ${cmd.desc}`);
    });
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`   Type a number to see usage, 'back' for menu, or 'q' to quit.\n`);
  };

  const showCommand = (cmd: typeof GROUPS[0]['commands'][0]) => {
    console.log(`\n\u{1F4DD} ${cmd.name}`);
    console.log(`${'─'.repeat(40)}`);
    console.log(`   ${cmd.desc}\n`);
    if ((cmd as any).example) {
      console.log(`   Example:`);
      console.log(`   $ ${(cmd as any).example}\n`);
    }
    console.log(`   Full help: realitydb ${cmd.name.split(' ')[0]} --help\n`);
  };

  let running = true;

  while (running) {
    showMainMenu();
    const input = (await ask('> ')).trim();

    if (input === 'q' || input === 'quit' || input === 'exit') {
      running = false;
      break;
    }

    if (input === '9') {
      console.log(WORKFLOW);
      continue;
    }

    const groupIdx = parseInt(input) - 1;
    if (groupIdx >= 0 && groupIdx < GROUPS.length) {
      let inGroup = true;
      while (inGroup) {
        showGroup(GROUPS[groupIdx]);
        const cmdInput = (await ask('> ')).trim();

        if (cmdInput === 'back' || cmdInput === 'b') {
          inGroup = false;
          break;
        }
        if (cmdInput === 'q' || cmdInput === 'quit') {
          inGroup = false;
          running = false;
          break;
        }

        const cmdIdx = parseInt(cmdInput) - 1;
        if (cmdIdx >= 0 && cmdIdx < GROUPS[groupIdx].commands.length) {
          showCommand(GROUPS[groupIdx].commands[cmdIdx]);
          await ask('Press Enter to continue...');
        }
      }
    }
  }

  rl.close();
  console.log('\n   Goodbye! Run any command directly: realitydb <command> --help\n');
}
