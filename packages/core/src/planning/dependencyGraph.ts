import type { ForeignKeySchema } from '@databox/schema';

export interface DependencyGraph {
  nodes: string[];
  edges: Array<{ from: string; to: string }>;
}

export function buildDependencyGraph(
  foreignKeys: ForeignKeySchema[],
): DependencyGraph {
  const nodeSet = new Set<string>();
  const edges: Array<{ from: string; to: string }> = [];

  for (const fk of foreignKeys) {
    nodeSet.add(fk.sourceTable);
    nodeSet.add(fk.targetTable);

    // Self-referencing tables: skip adding edge to avoid trivial cycle
    if (fk.sourceTable !== fk.targetTable) {
      edges.push({ from: fk.sourceTable, to: fk.targetTable });
    }
  }

  const nodes = Array.from(nodeSet).sort();

  return { nodes, edges };
}
