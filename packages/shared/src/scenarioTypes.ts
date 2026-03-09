/**
 * Scenario configuration — what scenario to apply and at what intensity.
 */
export interface ScenarioConfig {
  name: string;
  intensity: 'low' | 'medium' | 'high';
  targetTables?: string[];
  parameters?: Record<string, unknown>;
}

/**
 * Result of applying a scenario — summary of what changed.
 */
export interface ScenarioResult {
  scenarioName: string;
  rowsAffected: number;
  modifications: string[];
}
