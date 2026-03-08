import { createSeededRandom } from '@databox/shared';
import {
  inferColumnStrategy,
  inferTableStrategies,
  createGeneratorRegistry,
  generateEmail,
  generateFirstName,
  generateUuid,
  generateTimestamp,
  generateInteger,
} from '@databox/generators';
import type { GeneratorContext, GeneratedTable } from '@databox/generators';
import type { ColumnSchema, ForeignKeySchema, TableSchema } from '@databox/schema';
import type { ColumnStrategy } from '@databox/core';

function makeCtx(seed: ReturnType<typeof createSeededRandom>, rowIndex: number): GeneratorContext {
  return {
    seed,
    rowIndex,
    tableName: 'test',
    columnName: 'test',
    allGeneratedTables: new Map<string, GeneratedTable>(),
  };
}

console.log('DataBox Determinism Check');
console.log('═══════════════════════════════════════');

// --- Test 1: Email determinism ---
console.log('\n1. Email determinism (seed=42, 5 emails):');
const emails1: string[] = [];
const seed1 = createSeededRandom(42);
for (let i = 0; i < 5; i++) {
  emails1.push(generateEmail(makeCtx(seed1, i)));
}
console.log('  Run 1:', emails1);

const emails2: string[] = [];
const seed2 = createSeededRandom(42);
for (let i = 0; i < 5; i++) {
  emails2.push(generateEmail(makeCtx(seed2, i)));
}
console.log('  Run 2:', emails2);
const emailsMatch = JSON.stringify(emails1) === JSON.stringify(emails2);
console.log(`  Match: ${emailsMatch ? 'PASS ✅' : 'FAIL ❌'}`);

// --- Test 2: UUID determinism ---
console.log('\n2. UUID determinism (seed=42, 3 UUIDs):');
const uuids1: string[] = [];
const seedU1 = createSeededRandom(42);
for (let i = 0; i < 3; i++) {
  uuids1.push(generateUuid(makeCtx(seedU1, i)));
}
console.log('  Run 1:', uuids1);

const uuids2: string[] = [];
const seedU2 = createSeededRandom(42);
for (let i = 0; i < 3; i++) {
  uuids2.push(generateUuid(makeCtx(seedU2, i)));
}
console.log('  Run 2:', uuids2);
const uuidsMatch = JSON.stringify(uuids1) === JSON.stringify(uuids2);
console.log(`  Match: ${uuidsMatch ? 'PASS ✅' : 'FAIL ❌'}`);

// --- Test 3: UUID v4 format ---
console.log('\n3. UUID v4 format validation:');
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const allV4 = uuids1.every((u) => uuidRegex.test(u));
console.log(`  All valid v4: ${allV4 ? 'PASS ✅' : 'FAIL ❌'}`);

// --- Test 4: Strategy inference ---
console.log('\n4. Strategy inference:');

const emailCol: ColumnSchema = {
  name: 'email',
  dataType: 'varchar',
  udtName: 'varchar',
  isNullable: false,
  hasDefault: false,
  defaultValue: null,
  maxLength: 255,
  isPrimaryKey: false,
  isUnique: true,
  ordinalPosition: 3,
};
const emailStrategy = inferColumnStrategy(emailCol, []);
console.log(`  email column → kind: "${emailStrategy.kind}" ${emailStrategy.kind === 'email' ? 'PASS ✅' : 'FAIL ❌'}`);

const fkCol: ColumnSchema = {
  name: 'user_id',
  dataType: 'uuid',
  udtName: 'uuid',
  isNullable: false,
  hasDefault: false,
  defaultValue: null,
  maxLength: null,
  isPrimaryKey: false,
  isUnique: false,
  ordinalPosition: 2,
};
const fks: ForeignKeySchema[] = [
  { constraintName: 'fk_user', sourceTable: 'orders', sourceColumn: 'user_id', targetTable: 'users', targetColumn: 'id' },
];
const fkStrategy = inferColumnStrategy(fkCol, fks);
console.log(`  FK column → kind: "${fkStrategy.kind}" ${fkStrategy.kind === 'foreign_key' ? 'PASS ✅' : 'FAIL ❌'}`);

const amountCol: ColumnSchema = {
  name: 'total_amount',
  dataType: 'integer',
  udtName: 'int4',
  isNullable: false,
  hasDefault: false,
  defaultValue: null,
  maxLength: null,
  isPrimaryKey: false,
  isUnique: false,
  ordinalPosition: 4,
};
const amountStrategy = inferColumnStrategy(amountCol, []);
console.log(`  amount column → kind: "${amountStrategy.kind}" ${amountStrategy.kind === 'money' ? 'PASS ✅' : 'FAIL ❌'}`);

const uuidCol: ColumnSchema = {
  name: 'id',
  dataType: 'uuid',
  udtName: 'uuid',
  isNullable: false,
  hasDefault: true,
  defaultValue: 'gen_random_uuid()',
  maxLength: null,
  isPrimaryKey: true,
  isUnique: true,
  ordinalPosition: 1,
};
const uuidStrategy = inferColumnStrategy(uuidCol, []);
console.log(`  uuid id column → kind: "${uuidStrategy.kind}" ${uuidStrategy.kind === 'uuid' ? 'PASS ✅' : 'FAIL ❌'}`);

// --- Test 5: Registry covers all 18 kinds ---
console.log('\n5. Registry coverage:');
const registry = createGeneratorRegistry();
const allKinds: string[] = [
  'uuid', 'email', 'first_name', 'last_name', 'full_name', 'phone',
  'address', 'company_name', 'money', 'integer', 'float', 'boolean',
  'timestamp', 'enum', 'text', 'foreign_key', 'custom',
];
let registryOk = true;
for (const kind of allKinds) {
  try {
    const strategy: ColumnStrategy = { kind: kind as ColumnStrategy['kind'] };
    if (kind === 'enum') {
      strategy.options = { values: ['a', 'b'], weights: [0.5, 0.5] };
    }
    registry.getGenerator(strategy);
  } catch (e) {
    console.log(`  MISSING: ${kind}`);
    registryOk = false;
  }
}
console.log(`  All ${allKinds.length} kinds registered: ${registryOk ? 'PASS ✅' : 'FAIL ❌'}`);

// --- Test 6: Unknown kind throws ---
console.log('\n6. Unknown strategy kind error:');
let unknownThrew = false;
try {
  registry.getGenerator({ kind: 'nonexistent' as ColumnStrategy['kind'] });
} catch (e) {
  unknownThrew = true;
}
console.log(`  Unknown kind throws: ${unknownThrew ? 'PASS ✅' : 'FAIL ❌'}`);

// --- Test 7: inferTableStrategies ---
console.log('\n7. inferTableStrategies:');
const table: TableSchema = {
  name: 'users',
  schema: 'public',
  columns: [uuidCol, emailCol, fkCol],
  primaryKey: { columnName: 'id', constraintName: 'users_pkey' },
  estimatedRowCount: 100,
};
const strategies = inferTableStrategies(table, fks);
console.log(`  Returned ${strategies.length} strategies: ${strategies.length === 3 ? 'PASS ✅' : 'FAIL ❌'}`);

// --- Summary ---
console.log('\n═══════════════════════════════════════');
const allPassed = emailsMatch && uuidsMatch && allV4 && registryOk && unknownThrew;
console.log(`Overall: ${allPassed ? 'ALL TESTS PASS ✅' : 'SOME TESTS FAILED ❌'}`);
