/**
 * Timeline configuration for temporal data generation.
 */
export interface TimelineConfig {
  enabled: boolean;
  startDate: string; // ISO date
  endDate: string; // ISO date
  granularity: 'day' | 'week' | 'month';
  growthModel: GrowthModelConfig;
}

export interface GrowthModelConfig {
  kind: 'linear' | 'exponential' | 's-curve' | 'flat';
  initialCount: number;
  finalCount: number;
  parameters?: Record<string, number>;
}

export interface TimelineSlot {
  slotIndex: number;
  startDate: Date;
  endDate: Date;
  targetRowCount: number;
}

export interface TemporalConstraint {
  columnName: string;
  afterColumn?: string;
  afterTable?: string;
  withinDays?: number;
  mode: 'creation' | 'dependent' | 'lifecycle';
}
