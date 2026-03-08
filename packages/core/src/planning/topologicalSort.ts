import type { DependencyGraph } from './dependencyGraph.js';

export interface TopologicalResult {
  order: string[];
  hasCycle: boolean;
  cycleNodes?: string[];
}

/**
 * Kahn's algorithm (BFS-based) for deterministic topological sort.
 * "from" depends on "to" — so "to" must come before "from" in insertion order.
 */
export function topologicalSort(graph: DependencyGraph): TopologicalResult {
  // Build adjacency list and in-degree map
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of graph.nodes) {
    inDegree.set(node, 0);
    adjacency.set(node, []);
  }

  for (const edge of graph.edges) {
    // edge.from depends on edge.to → edge.to must come first
    // So the directed edge is: to → from (to must be processed before from)
    const neighbors = adjacency.get(edge.to) ?? [];
    neighbors.push(edge.from);
    adjacency.set(edge.to, neighbors);
    inDegree.set(edge.from, (inDegree.get(edge.from) ?? 0) + 1);
  }

  // Start with nodes that have no dependencies (in-degree 0)
  // Sort for determinism
  const queue: string[] = [];
  for (const node of graph.nodes) {
    if ((inDegree.get(node) ?? 0) === 0) {
      queue.push(node);
    }
  }
  queue.sort();

  const order: string[] = [];

  while (queue.length > 0) {
    // Sort queue for deterministic order at each step
    queue.sort();
    const current = queue.shift()!;
    order.push(current);

    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (order.length < graph.nodes.length) {
    // Cycle detected — nodes not in order are involved in cycles
    const inOrder = new Set(order);
    const cycleNodes = graph.nodes.filter((n) => !inOrder.has(n)).sort();
    return { order, hasCycle: true, cycleNodes };
  }

  return { order, hasCycle: false };
}
