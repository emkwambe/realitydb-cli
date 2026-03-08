import type { GeneratorContext } from '../types.js';

const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Fixed reference point for determinism (2025-01-01T00:00:00Z)
const REFERENCE_TIME = 1735689600000;

export function generateTimestamp(ctx: GeneratorContext, mode: 'past' | 'recent' | 'timeline'): string {
  let rangeMs: number;

  switch (mode) {
    case 'past':
      rangeMs = TWO_YEARS_MS;
      break;
    case 'recent':
      rangeMs = THIRTY_DAYS_MS;
      break;
    case 'timeline':
      // Placeholder: use past for now
      rangeMs = TWO_YEARS_MS;
      break;
  }

  const offsetMs = ctx.seed.nextInt(0, rangeMs);
  const timestamp = REFERENCE_TIME - offsetMs;
  return new Date(timestamp).toISOString();
}
