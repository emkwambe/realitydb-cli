/**
 * Lifecycle simulation types for causally-connected data generation.
 *
 * A lifecycle definition models how an entity (user, account) moves through
 * states over time, with side effects on related tables and cross-table
 * correlations that ensure data coherence.
 */

export interface LifecycleDefinition {
  /** Entity type name, e.g. "user", "account" */
  entityName: string;
  /** Root table that holds the entity, e.g. "users", "accounts" */
  rootTable: string;
  /** Possible states the entity can be in */
  states: LifecycleState[];
  /** Allowed transitions between states */
  transitions: LifecycleTransition[];
  /** Cross-table correlations that adjust related data */
  correlations: CrossTableCorrelation[];
}

export interface LifecycleState {
  /** State identifier, e.g. "trial", "active", "churned" */
  name: string;
  /** Probability weight for an entity ending up in this state */
  weight: number;
  /** Column values forced when entity is in this state (on rootTable) */
  columnValues: Record<string, unknown>;
}

export interface LifecycleTransition {
  /** Source state name */
  from: string;
  /** Target state name */
  to: string;
  /** Probability of this transition occurring (0-1) */
  probability: number;
  /** Side effects on other tables when this transition fires */
  sideEffects: SideEffect[];
}

export interface SideEffect {
  /** Target table name */
  table: string;
  /** Whether to create a new row or update existing rows */
  action: 'create' | 'update';
  /** Column values to set */
  values: Record<string, unknown>;
}

export interface CrossTableCorrelation {
  /** Human-readable description */
  description: string;
  /** Condition that triggers the correlation */
  condition: CorrelationCondition;
  /** Effect to apply when condition matches */
  effect: CorrelationEffect;
}

export interface CorrelationCondition {
  table: string;
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in';
  value: unknown;
}

export interface CorrelationEffect {
  table: string;
  column: string;
  /** Multiply the row count in the target table */
  multiplier?: number;
  /** Override values in the target table */
  values?: unknown[];
}

/**
 * Result of simulating lifecycles for a batch of entities.
 */
export interface SimulationResult {
  /** Rows grouped by table name */
  tables: Map<string, Record<string, unknown>[]>;
  /** Number of entities simulated */
  entityCount: number;
  /** State distribution: state name → count */
  stateDistribution: Map<string, number>;
}
