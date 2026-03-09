import type { TimelineConfig } from '@databox/shared';

/**
 * Parses a human-friendly timeline string into a TimelineConfig.
 *
 * Supported formats:
 *   "12-months" → 12 months ending today, s-curve growth
 *   "6-months"  → 6 months ending today, s-curve growth
 *   "24-months" → 24 months ending today, s-curve growth
 *   "1-year"    → alias for 12-months
 *   "2-years"   → alias for 24-months
 */
export function parseTimelineString(input: string): TimelineConfig {
  const normalized = input.trim().toLowerCase();

  let months: number;

  // Handle year aliases
  if (normalized === '1-year') {
    months = 12;
  } else if (normalized === '2-years') {
    months = 24;
  } else {
    // Parse N-months pattern
    const match = normalized.match(/^(\d+)-months?$/);
    if (!match) {
      throw new Error(
        `Invalid timeline format: "${input}". ` +
        `Supported: "6-months", "12-months", "24-months", "1-year", "2-years"`,
      );
    }
    months = parseInt(match[1], 10);
    if (months < 1 || months > 120) {
      throw new Error(
        `Timeline duration must be between 1 and 120 months. Got: ${months}`,
      );
    }
  }

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setHours(0, 0, 0, 0);

  return {
    enabled: true,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    granularity: 'month',
    growthModel: {
      kind: 's-curve',
      initialCount: 1,
      finalCount: 0, // Will be computed from plan's rowCount
    },
  };
}
