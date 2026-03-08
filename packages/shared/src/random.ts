export interface SeededRandom {
  next(): number;
  nextInt(min: number, max: number): number;
  nextFloat(min: number, max: number): number;
  nextBoolean(weight?: number): boolean;
  pick<T>(array: T[]): T;
}

/**
 * Creates a deterministic PRNG using a mulberry32 algorithm.
 * Same seed always produces identical sequences.
 */
export function createSeededRandom(seed: number): SeededRandom {
  let state = seed | 0;

  function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    nextInt(min: number, max: number): number {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    nextFloat(min: number, max: number): number {
      return next() * (max - min) + min;
    },
    nextBoolean(weight: number = 0.5): boolean {
      return next() < weight;
    },
    pick<T>(array: T[]): T {
      return array[Math.floor(next() * array.length)];
    },
  };
}
