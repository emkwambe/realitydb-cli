import type { TimelineConfig, TimelineSlot } from '@databox/shared';

/**
 * Divides the time range into slots based on granularity and distributes
 * totalRowCount across slots using the growth model.
 */
export function computeTimelineSlots(config: TimelineConfig): TimelineSlot[] {
  const start = new Date(config.startDate);
  const end = new Date(config.endDate);

  // Generate slot boundaries
  const boundaries: Date[] = [];
  const current = new Date(start);

  while (current < end) {
    boundaries.push(new Date(current));
    switch (config.granularity) {
      case 'day':
        current.setUTCDate(current.getUTCDate() + 1);
        break;
      case 'week':
        current.setUTCDate(current.getUTCDate() + 7);
        break;
      case 'month':
        current.setUTCMonth(current.getUTCMonth() + 1);
        break;
    }
  }

  const slotCount = boundaries.length;
  if (slotCount === 0) {
    return [];
  }

  // Compute row distribution
  const { initialCount, finalCount } = config.growthModel;
  const totalRows = finalCount;
  let distribution: number[];

  switch (config.growthModel.kind) {
    case 'linear':
      distribution = linearGrowth(slotCount, initialCount, totalRows);
      break;
    case 'exponential':
      distribution = exponentialGrowth(slotCount, initialCount, totalRows);
      break;
    case 's-curve':
      distribution = sCurveGrowth(slotCount, initialCount, totalRows);
      break;
    case 'flat':
      distribution = flatGrowth(slotCount, totalRows);
      break;
  }

  // Build slots
  const slots: TimelineSlot[] = [];
  for (let i = 0; i < slotCount; i++) {
    const slotStart = boundaries[i];
    const slotEnd = i + 1 < slotCount ? boundaries[i + 1] : end;

    slots.push({
      slotIndex: i,
      startDate: slotStart,
      endDate: slotEnd,
      targetRowCount: distribution[i],
    });
  }

  return slots;
}

/**
 * Linearly increasing row counts that sum to total.
 */
export function linearGrowth(slots: number, initial: number, total: number): number[] {
  if (slots <= 0) return [];
  if (slots === 1) return [total];

  // Linear interpolation: counts[i] = initial + (final - initial) * i / (slots - 1)
  // where final is computed so the sum = total
  const rawWeights: number[] = [];
  for (let i = 0; i < slots; i++) {
    rawWeights.push(initial + i);
  }

  return distributeByWeights(rawWeights, total);
}

/**
 * Exponentially increasing row counts (slow start, fast end) that sum to total.
 */
export function exponentialGrowth(slots: number, initial: number, total: number): number[] {
  if (slots <= 0) return [];
  if (slots === 1) return [total];

  const rawWeights: number[] = [];
  for (let i = 0; i < slots; i++) {
    // Exponential curve: e^(k*i) where k scales across slots
    rawWeights.push(Math.exp((i / (slots - 1)) * 3));
  }

  return distributeByWeights(rawWeights, total);
}

/**
 * S-curve distribution (slow start, fast middle, slow end) that sums to total.
 * Most realistic for user growth.
 */
export function sCurveGrowth(slots: number, initial: number, total: number): number[] {
  if (slots <= 0) return [];
  if (slots === 1) return [total];

  const rawWeights: number[] = [];
  for (let i = 0; i < slots; i++) {
    // Logistic S-curve centered at midpoint
    const x = (i / (slots - 1)) * 12 - 6; // map to [-6, 6]
    rawWeights.push(1 / (1 + Math.exp(-x)));
  }

  return distributeByWeights(rawWeights, total);
}

/**
 * Uniform distribution across all slots that sums to total.
 */
export function flatGrowth(slots: number, total: number): number[] {
  if (slots <= 0) return [];
  if (slots === 1) return [total];

  const base = Math.floor(total / slots);
  const remainder = total - base * slots;

  const result: number[] = [];
  for (let i = 0; i < slots; i++) {
    result.push(base + (i < remainder ? 1 : 0));
  }

  return result;
}

/**
 * Distributes total rows across slots proportional to weights.
 * Ensures sum equals total via largest remainder method.
 */
function distributeByWeights(weights: number[], total: number): number[] {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) {
    return flatGrowth(weights.length, total);
  }

  // Compute fractional allocations
  const fractional = weights.map((w) => (w / totalWeight) * total);

  // Floor each allocation
  const floored = fractional.map((f) => Math.floor(f));
  let remaining = total - floored.reduce((s, v) => s + v, 0);

  // Distribute remainder by largest fractional part
  const remainders = fractional.map((f, i) => ({ index: i, frac: f - floored[i] }));
  remainders.sort((a, b) => b.frac - a.frac);

  for (let i = 0; i < remaining; i++) {
    floored[remainders[i].index]++;
  }

  // Ensure no negatives (handle edge case of very small totals)
  return floored.map((v) => Math.max(0, v));
}
