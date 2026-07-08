import { loadLicense } from '../auth/license';
import {
  normalizeTables,
  topologicalSort,
  distributeRows,
  generateData,
  generateCreateTable,
} from '@realitydb/engine';
import * as fs from 'fs';
import * as path from 'path';

// Scenario definitions
interface Scenario {
  name: string;
  description: string;
  apply: (allData: Record<string, any[]>, config: ScenarioConfig) => void;
}

interface ScenarioConfig {
  intensity: 'low' | 'medium' | 'high';
  timelineMonths: number;
  startDate: Date;
}

const INTENSITY_MULTIPLIER = { low: 1.5, medium: 3, high: 5 };

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString();
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// S-curve distribution: more data points in the middle of the timeline
function sCurveTimestamp(start: Date, end: Date, progress: number): string {
  // Sigmoid function maps 0-1 to S-curve
  const k = 8; // steepness
  const sigmoid = 1 / (1 + Math.exp(-k * (progress - 0.5)));
  const t = start.getTime() + sigmoid * (end.getTime() - start.getTime());
  return new Date(t).toISOString();
}

// Linear growth with noise
function linearTimestamp(start: Date, end: Date, progress: number): string {
  const noise = (Math.random() - 0.5) * 0.05; // +/- 2.5% noise
  const p = Math.max(0, Math.min(1, progress + noise));
  const t = start.getTime() + p * (end.getTime() - start.getTime());
  return new Date(t).toISOString();
}

const SCENARIOS: Record<string, Scenario> = {
  'fraud-spike': {
    name: 'Fraud Spike',
    description: 'Concentrated burst of fraud alerts in a 2-week window',
    apply: (allData, config) => {
      const mult = INTENSITY_MULTIPLIER[config.intensity];
      // Find fraud-related tables
      for (const tableName of Object.keys(allData)) {
        if (tableName.includes('fraud') || tableName.includes('alert')) {
          const rows = allData[tableName];
          // Move 60% of fraud rows into a 2-week spike window
          const spikeStart = addMonths(config.startDate, Math.floor(config.timelineMonths * 0.6));
          const spikeEnd = new Date(spikeStart.getTime() + 14 * 24 * 60 * 60 * 1000);
          const spikeCount = Math.floor(rows.length * 0.6);

          for (let i = 0; i < spikeCount && i < rows.length; i++) {
            if (rows[i].created_at) rows[i].created_at = randomDate(spikeStart, spikeEnd);
            if (rows[i].detected_at) rows[i].detected_at = randomDate(spikeStart, spikeEnd);
            // Increase risk scores during spike
            if (rows[i].risk_score !== undefined) {
              rows[i].risk_score = Math.min(100, Math.floor(rows[i].risk_score * mult));
            }
            // Set more to confirmed fraud during spike
            if (rows[i].status && i < spikeCount * 0.4) {
              rows[i].status = 'confirmed_fraud';
            }
          }
        }
      }
    },
  },

  'churn-wave': {
    name: 'Churn Wave',
    description: '30% of subscriptions cancel in one month',
    apply: (allData, config) => {
      const churnRate = config.intensity === 'high' ? 0.45 : config.intensity === 'medium' ? 0.30 : 0.15;
      for (const tableName of Object.keys(allData)) {
        if (tableName.includes('subscription') || tableName.includes('account')) {
          const rows = allData[tableName];
          const churnMonth = addMonths(config.startDate, Math.floor(config.timelineMonths * 0.7));
          const churnEnd = addMonths(churnMonth, 1);
          const churnCount = Math.floor(rows.length * churnRate);

          for (let i = 0; i < churnCount && i < rows.length; i++) {
            if (rows[i].status) rows[i].status = 'cancelled';
            if (rows[i].cancelled_at !== undefined) rows[i].cancelled_at = randomDate(churnMonth, churnEnd);
            if (rows[i].cancel_reason !== undefined) rows[i].cancel_reason = ['too_expensive', 'not_using', 'competitor', 'poor_support'][Math.floor(Math.random() * 4)];
          }
        }
      }
    },
  },

  'holiday-rush': {
    name: 'Holiday Rush',
    description: '3x orders in Nov-Dec with a January drop',
    apply: (allData, config) => {
      const mult = INTENSITY_MULTIPLIER[config.intensity];
      for (const tableName of Object.keys(allData)) {
        if (tableName.includes('order') && !tableName.includes('audit') && !tableName.includes('status')) {
          const rows = allData[tableName];
          // Concentrate 50% of orders into Nov-Dec window
          const year = config.startDate.getFullYear();
          const holidayStart = new Date(year, 10, 1); // Nov 1
          const holidayEnd = new Date(year, 11, 31); // Dec 31
          const rushCount = Math.floor(rows.length * 0.5);

          for (let i = 0; i < rushCount && i < rows.length; i++) {
            if (rows[i].created_at) rows[i].created_at = randomDate(holidayStart, holidayEnd);
            // Higher order values during holiday
            if (rows[i].total !== undefined) {
              rows[i].total = Math.round(rows[i].total * (1 + Math.random() * mult) * 100) / 100;
            }
            if (rows[i].amount !== undefined) {
              rows[i].amount = Math.round(rows[i].amount * (1 + Math.random()) * 100) / 100;
            }
          }
        }
      }
    },
  },

  'data-breach': {
    name: 'Data Breach',
    description: 'Mass password resets and audit log spike',
    apply: (allData, config) => {
      for (const tableName of Object.keys(allData)) {
        if (tableName.includes('audit') || tableName.includes('log')) {
          const rows = allData[tableName];
          const breachDate = addMonths(config.startDate, Math.floor(config.timelineMonths * 0.5));
          const breachEnd = new Date(breachDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3-day window
          const spikeCount = Math.floor(rows.length * 0.7);

          for (let i = 0; i < spikeCount && i < rows.length; i++) {
            if (rows[i].created_at) rows[i].created_at = randomDate(breachDate, breachEnd);
            if (rows[i].action) rows[i].action = ['password_reset', 'security_alert', 'account_locked', 'force_logout'][Math.floor(Math.random() * 4)];
          }
        }
        if (tableName.includes('notification')) {
          const rows = allData[tableName];
          const breachDate = addMonths(config.startDate, Math.floor(config.timelineMonths * 0.5));
          const spikeCount = Math.floor(rows.length * 0.5);
          for (let i = 0; i < spikeCount && i < rows.length; i++) {
            if (rows[i].type) rows[i].type = 'security_alert';
            if (rows[i].priority) rows[i].priority = 'urgent';
          }
        }
      }
    },
  },

  'seasonal-enrollment': {
    name: 'Seasonal Enrollment',
    description: 'Student registrations peak in Aug-Sep',
    apply: (allData, config) => {
      for (const tableName of Object.keys(allData)) {
        if (tableName.includes('student') || tableName.includes('enrollment')) {
          const rows = allData[tableName];
          const year = config.startDate.getFullYear();
          const enrollStart = new Date(year, 7, 1); // Aug 1
          const enrollEnd = new Date(year, 8, 30); // Sep 30
          const peakCount = Math.floor(rows.length * 0.65);

          for (let i = 0; i < peakCount && i < rows.length; i++) {
            if (rows[i].created_at) rows[i].created_at = randomDate(enrollStart, enrollEnd);
            if (rows[i].enrolled_at) rows[i].enrolled_at = randomDate(enrollStart, enrollEnd);
          }
        }
      }
    },
  },

  'payment-failures': {
    name: 'Payment Failures',
    description: 'Payment failure rate jumps to 25%',
    apply: (allData, config) => {
      const failRate = config.intensity === 'high' ? 0.40 : config.intensity === 'medium' ? 0.25 : 0.12;
      for (const tableName of Object.keys(allData)) {
        if (tableName.includes('payment') || tableName.includes('invoice') || tableName.includes('transaction')) {
          const rows = allData[tableName];
          const failWindow = addMonths(config.startDate, Math.floor(config.timelineMonths * 0.6));
          const failEnd = addMonths(failWindow, 1);
          const failCount = Math.floor(rows.length * failRate);

          for (let i = 0; i < failCount && i < rows.length; i++) {
            if (rows[i].status) rows[i].status = 'failed';
            if (rows[i].created_at) rows[i].created_at = randomDate(failWindow, failEnd);
            if (rows[i].error_code !== undefined) {
              rows[i].error_code = ['insufficient_funds', 'card_declined', 'expired_card', 'processor_error'][Math.floor(Math.random() * 4)];
            }
          }
        }
      }
    },
  },
};

export async function simulateCommand(options: {
  pack: string;
  scenario?: string;
  timeline?: string;
  rows?: string;
  output?: string;
  format?: string;
  intensity?: string;
  seed?: string;
  listScenarios?: boolean;
}): Promise<void> {
  // List scenarios mode
  if (options.listScenarios) {
    console.log(`\n\u{1F3AC} Available Scenarios`);
    console.log(`${'\u2500'.repeat(40)}`);
    for (const [key, scenario] of Object.entries(SCENARIOS)) {
      console.log(`   \u{1F3AF} ${key}`);
      console.log(`      ${scenario.description}`);
    }
    console.log(`\n   Usage: realitydb simulate --pack <file> --scenario <name> --timeline 12-months\n`);
    return;
  }

  const license = loadLicense();
  const startTime = Date.now();
  const rows = options.rows ? parseInt(options.rows) : 10000;
  const format = options.format || 'json';
  const intensity = (options.intensity || 'medium') as 'low' | 'medium' | 'high';
  const timelineStr = options.timeline || '12-months';

  // Parse timeline
  const timelineMatch = timelineStr.match(/^(\d+)-(month|months|week|weeks|day|days)$/);
  if (!timelineMatch) {
    console.error(`\n\u274C Invalid timeline: ${timelineStr}`);
    console.error(`   Use: 12-months, 6-months, 4-weeks, 30-days`);
    process.exit(1);
  }

  const timelineValue = parseInt(timelineMatch[1]);
  const timelineUnit = timelineMatch[2].replace(/s$/, '');
  let timelineMonths = timelineValue;
  if (timelineUnit === 'week') timelineMonths = Math.ceil(timelineValue / 4);
  if (timelineUnit === 'day') timelineMonths = Math.ceil(timelineValue / 30);

  // Parse scenarios
  const scenarioNames = options.scenario ? options.scenario.split(',').map(s => s.trim()) : [];
  for (const name of scenarioNames) {
    if (!SCENARIOS[name]) {
      console.error(`\n\u274C Unknown scenario: ${name}`);
      console.error(`   Available: ${Object.keys(SCENARIOS).join(', ')}`);
      console.error(`   List all: realitydb simulate --list-scenarios`);
      process.exit(1);
    }
  }

  // Resolve built-in pack name (e.g. "fintech", "eu-banking") to its bundled
  // file path — mirrors the run command's resolution logic.
  if (!options.pack.includes('/') && !options.pack.includes('\\') && !options.pack.endsWith('.json')) {
    const packDir = path.resolve(path.dirname(process.argv[1] || __filename), 'packs');
    const bundledPath = path.resolve(packDir, options.pack + '.json');
    if (fs.existsSync(bundledPath)) {
      options.pack = bundledPath;
    } else {
      const userDir = path.resolve(process.env.HOME || process.env.USERPROFILE || '.', '.realitydb', 'templates');
      const userPath = path.resolve(userDir, options.pack + '.json');
      if (fs.existsSync(userPath)) options.pack = userPath;
    }
  }

  // Read pack
  const packPath = path.resolve(options.pack);
  if (!fs.existsSync(packPath)) {
    console.error(`\n\u274C Pack file not found: ${packPath}`);
    process.exit(1);
  }

  const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8'));
  const { tables, templateName } = normalizeTables(pack);

  if (tables.length === 0) {
    console.error(`\n\u274C No tables found in pack file.`);
    process.exit(1);
  }

  const ordered = topologicalSort(tables);
  const rowsPerTable = distributeRows(ordered, rows);

  console.log(`\n\u{1F3AC} RealityDB Simulate`);
  console.log(`${'\u2500'.repeat(40)}`);
  if (license) {
    console.log(`   User: ${license.email}`);
    console.log(`   Plan: ${license.tier.toUpperCase()}`);
  }
  console.log(`   Pack: ${options.pack}`);
  console.log(`   Timeline: ${timelineStr}`);
  console.log(`   Intensity: ${intensity}`);
  if (scenarioNames.length > 0) {
    console.log(`   Scenarios: ${scenarioNames.join(', ')}`);
  } else {
    console.log(`   Scenarios: none (timeline only)`);
  }
  console.log(`   Format: ${format.toUpperCase()}`);
  console.log(`   Tables: ${tables.length}`);
  console.log(`${'\u2500'.repeat(40)}`);

  // Generate base data
  console.log(`   Generating base data...`);
  const { allData, actualTotal, elapsed } = generateData(ordered, rowsPerTable);

  // Apply timeline — distribute created_at across the timeline
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - timelineMonths);
  const endDate = new Date();

  console.log(`   Applying timeline (${timelineStr})...`);

  for (const tableName of Object.keys(allData)) {
    const tableRows = allData[tableName];
    for (let i = 0; i < tableRows.length; i++) {
      const progress = i / tableRows.length;
      if (tableRows[i].created_at) {
        tableRows[i].created_at = sCurveTimestamp(startDate, endDate, progress);
      }
      // Dependent timestamps should be after created_at
      if (tableRows[i].updated_at && tableRows[i].created_at) {
        const created = new Date(tableRows[i].created_at);
        const maxOffset = 30 * 24 * 60 * 60 * 1000; // up to 30 days later
        tableRows[i].updated_at = new Date(created.getTime() + Math.random() * maxOffset).toISOString();
      }
      if (tableRows[i].completed_at && tableRows[i].created_at && tableRows[i].status !== 'cancelled') {
        const created = new Date(tableRows[i].created_at);
        tableRows[i].completed_at = new Date(created.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
      }
      if (tableRows[i].shipped_at && tableRows[i].created_at && tableRows[i].status !== 'cancelled') {
        const created = new Date(tableRows[i].created_at);
        tableRows[i].shipped_at = new Date(created.getTime() + (1 + Math.random() * 3) * 24 * 60 * 60 * 1000).toISOString();
      }
      if (tableRows[i].delivered_at && tableRows[i].shipped_at) {
        const shipped = new Date(tableRows[i].shipped_at);
        tableRows[i].delivered_at = new Date(shipped.getTime() + (1 + Math.random() * 5) * 24 * 60 * 60 * 1000).toISOString();
      }
    }
  }

  // Apply scenarios
  if (scenarioNames.length > 0) {
    const scenarioConfig: ScenarioConfig = { intensity, timelineMonths, startDate };

    for (const name of scenarioNames) {
      console.log(`   Injecting scenario: ${SCENARIOS[name].name}...`);
      SCENARIOS[name].apply(allData, scenarioConfig);
    }
  }

  // Output
  const outputFile = options.output || `simulated-${Date.now()}.${format}`;

  if (format === 'sql') {
    const fd = fs.openSync(outputFile, 'w');
    const header = [
      '-- ============================================',
      `-- Simulated by RealityDB CLI`,
      `-- Timeline: ${timelineStr}`,
      `-- Scenarios: ${scenarioNames.length > 0 ? scenarioNames.join(', ') : 'none'}`,
      `-- Intensity: ${intensity}`,
      `-- Total rows: ${actualTotal}`,
      `-- Generated at: ${new Date().toISOString()}`,
      '-- ============================================',
      '',
    ].join('\n');
    fs.writeSync(fd, header);

    // CREATE TABLE statements
    for (const table of ordered) {
      const ddl = generateCreateTable(table);
      fs.writeSync(fd, `DROP TABLE IF EXISTS "${table.name}" CASCADE;\n`);
      fs.writeSync(fd, ddl + '\n\n');
    }

    // INSERT statements
    const { generateInsertStatements } = await import('@realitydb/engine');
    for (const table of ordered) {
      const tableData = allData[table.name];
      if (!tableData || tableData.length === 0) continue;
      const sql = generateInsertStatements(table.name, tableData);
      fs.writeSync(fd, sql + '\n\n');
    }

    fs.closeSync(fd);
  } else {
    // JSON output
    const fd = fs.openSync(outputFile, 'w');
    fs.writeSync(fd, JSON.stringify({
      meta: {
        generator: 'realitydb-simulate',
        timeline: timelineStr,
        scenarios: scenarioNames,
        intensity,
        totalRows: actualTotal,
        tables: Object.keys(allData).length,
        generatedAt: new Date().toISOString(),
      },
      data: allData,
    }, null, 2));
    fs.closeSync(fd);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n\u2705 Simulation complete!`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   \u{1F4C1} Output: ${outputFile}`);
  console.log(`   \u{1F4CA} Total rows: ${actualTotal.toLocaleString()}`);
  console.log(`   \u{1F4C5} Timeline: ${timelineStr} (${startDate.toISOString().split('T')[0]} → ${endDate.toISOString().split('T')[0]})`);
  if (scenarioNames.length > 0) {
    console.log(`   \u{1F3AF} Scenarios: ${scenarioNames.map(s => SCENARIOS[s].name).join(', ')}`);
  }
  console.log(`   \u23F1\uFE0F  Time: ${totalTime}s`);
  console.log(``);
}
