import type { DatabaseSchema, ForeignKeySchema } from '@databox/schema';
import type { TemporalConstraint } from '@databox/shared';
import type { SeededRandom } from '@databox/shared';
import type { GeneratedRow } from './types.js';

const TIMESTAMP_COLUMN_PATTERNS = [
  'created_at', 'updated_at', 'deleted_at', 'signup_at', 'registered_at',
  'started_at', 'ended_at', 'canceled_at', 'cancelled_at',
  'ordered_at', 'shipped_at', 'delivered_at',
  'paid_at', 'charged_at', 'invoiced_at',
  'expires_at', 'expired_at',
];

const LIFECYCLE_ORDER: Record<string, string[]> = {
  // Common lifecycle progressions
  default: ['created_at', 'updated_at', 'deleted_at'],
  subscription: ['started_at', 'canceled_at', 'cancelled_at', 'ended_at'],
  order: ['ordered_at', 'shipped_at', 'delivered_at'],
};

/**
 * Automatically infers temporal constraints from schema and FK relationships.
 * Returns a map of tableName → TemporalConstraint[].
 */
export function resolveTemporalConstraints(
  schema: DatabaseSchema,
  foreignKeys: ForeignKeySchema[],
  _templateName?: string,
): Map<string, TemporalConstraint[]> {
  const constraintMap = new Map<string, TemporalConstraint[]>();

  for (const table of schema.tables) {
    const constraints: TemporalConstraint[] = [];
    const timestampCols = table.columns
      .filter((c) => isTimestampColumn(c.name, c.udtName))
      .map((c) => c.name);

    if (timestampCols.length === 0) {
      continue;
    }

    // Mark creation timestamps
    const creationCol = findCreationColumn(timestampCols);
    if (creationCol) {
      constraints.push({
        columnName: creationCol,
        mode: 'creation',
      });
    }

    // Infer lifecycle ordering
    const lifecycleCols = inferLifecycleOrder(timestampCols);
    for (let i = 1; i < lifecycleCols.length; i++) {
      constraints.push({
        columnName: lifecycleCols[i],
        afterColumn: lifecycleCols[i - 1],
        mode: 'lifecycle',
        withinDays: 90,
      });
    }

    // Infer FK-based temporal dependencies
    const tableFKs = foreignKeys.filter((fk) => fk.sourceTable === table.name);
    for (const fk of tableFKs) {
      const parentTable = schema.tables.find((t) => t.name === fk.targetTable);
      if (!parentTable) continue;

      const parentTimestampCols = parentTable.columns
        .filter((c) => isTimestampColumn(c.name, c.udtName))
        .map((c) => c.name);

      const parentCreation = findCreationColumn(parentTimestampCols);
      if (parentCreation && creationCol) {
        // Child creation should be after parent creation
        const alreadyHasConstraint = constraints.some(
          (c) => c.columnName === creationCol && c.afterTable === fk.targetTable,
        );
        if (!alreadyHasConstraint) {
          constraints.push({
            columnName: creationCol,
            afterTable: fk.targetTable,
            afterColumn: parentCreation,
            mode: 'dependent',
            withinDays: 365,
          });
        }
      }
    }

    if (constraints.length > 0) {
      constraintMap.set(table.name, constraints);
    }
  }

  return constraintMap;
}

/**
 * Generates a timestamp that respects the given constraint.
 */
export function applyTemporalConstraint(
  random: SeededRandom,
  constraint: TemporalConstraint,
  parentRow: GeneratedRow | null,
  slotStart: Date,
  slotEnd: Date,
): string {
  const slotMs = slotEnd.getTime() - slotStart.getTime();

  switch (constraint.mode) {
    case 'creation': {
      // Random within slot range
      const offsetMs = Math.floor(random.next() * Math.max(slotMs, 1));
      return new Date(slotStart.getTime() + offsetMs).toISOString();
    }

    case 'dependent': {
      // After parent's timestamp, within withinDays
      let afterMs = slotStart.getTime();
      if (parentRow && constraint.afterColumn) {
        const parentTs = parentRow[constraint.afterColumn];
        if (typeof parentTs === 'string') {
          afterMs = new Date(parentTs).getTime();
        }
      }

      const maxDeltaMs = (constraint.withinDays ?? 30) * 24 * 60 * 60 * 1000;
      const upperBound = Math.min(afterMs + maxDeltaMs, slotEnd.getTime());
      const range = Math.max(upperBound - afterMs, 1);
      const offsetMs = Math.floor(random.next() * range);
      return new Date(afterMs + offsetMs).toISOString();
    }

    case 'lifecycle': {
      // After the referenced column in the same row
      let afterMs = slotStart.getTime();
      if (parentRow && constraint.afterColumn) {
        const refTs = parentRow[constraint.afterColumn];
        if (typeof refTs === 'string') {
          afterMs = new Date(refTs).getTime();
        }
      }

      const maxDeltaMs = (constraint.withinDays ?? 90) * 24 * 60 * 60 * 1000;
      const upperBound = Math.min(afterMs + maxDeltaMs, slotEnd.getTime());
      const range = Math.max(upperBound - afterMs, 1);
      const offsetMs = Math.floor(random.next() * range);
      return new Date(afterMs + offsetMs).toISOString();
    }
  }
}

function isTimestampColumn(columnName: string, udtName: string): boolean {
  const lower = columnName.toLowerCase();
  const isTimestampType = ['timestamp', 'timestamptz', 'date'].includes(udtName.toLowerCase());
  if (isTimestampType) return true;
  return TIMESTAMP_COLUMN_PATTERNS.some((p) => lower.includes(p));
}

function findCreationColumn(columns: string[]): string | undefined {
  const creationPatterns = ['created_at', 'signup_at', 'registered_at', 'ordered_at'];
  for (const pattern of creationPatterns) {
    const found = columns.find((c) => c.toLowerCase() === pattern);
    if (found) return found;
  }
  // Fallback: any _at column that's not an end/cancel/delete column
  const endPatterns = ['deleted_at', 'canceled_at', 'cancelled_at', 'ended_at', 'updated_at', 'shipped_at', 'delivered_at', 'expired_at'];
  return columns.find((c) => !endPatterns.includes(c.toLowerCase()));
}

function inferLifecycleOrder(columns: string[]): string[] {
  // Try known lifecycle patterns
  for (const orderDef of Object.values(LIFECYCLE_ORDER)) {
    const matched = orderDef.filter((col) =>
      columns.some((c) => c.toLowerCase() === col),
    );
    if (matched.length >= 2) {
      return matched;
    }
  }
  return [];
}
