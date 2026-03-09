import type { ForeignKeyReferencePlan } from '@databox/shared';
import type { GeneratorContext } from './types.js';

export function resolveForeignKey(
  ctx: GeneratorContext,
  ref: ForeignKeyReferencePlan,
): unknown {
  const referencedTable = ctx.allGeneratedTables.get(ref.referencedTable);

  if (!referencedTable) {
    throw new Error(
      `FK resolution failed: referenced table "${ref.referencedTable}" has not been generated yet. ` +
      `Ensure tables are generated in topological order. ` +
      `(resolving ${ctx.tableName}.${ctx.columnName})`,
    );
  }

  if (referencedTable.rows.length === 0) {
    throw new Error(
      `FK resolution failed: referenced table "${ref.referencedTable}" has 0 rows. ` +
      `(resolving ${ctx.tableName}.${ctx.columnName})`,
    );
  }

  // Selection mode
  switch (ref.selectionMode) {
    case 'uniform':
    case 'weighted':
    case 'parent-linked': {
      // weighted and parent-linked are placeholders — use uniform for now
      const row = ctx.seed.pick(referencedTable.rows);
      return row[ref.referencedColumn];
    }
    default:
      throw new Error(
        `Unknown FK selection mode: "${ref.selectionMode}" ` +
        `(resolving ${ctx.tableName}.${ctx.columnName})`,
      );
  }
}
