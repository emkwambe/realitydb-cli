// ─── EU financial distributions (Blocker 8) ──────────────────────────────────
// Pure data. Per-metric, per-country distribution parameters used by the Phase
// 4j `calibrated` strategy. Sources: EMF Hypostat 2025 (mortgage), retail
// spending patterns (transaction), national health accounts (healthcare cost).
// No sampling logic here — Box-Muller / gamma sampling lives in the strategy.

export interface DistributionParams {
  mean: number;
  stddev: number;
  min: number;
  max: number;
  distribution: 'normal' | 'lognormal' | 'gamma';
}

export const EU_FINANCIAL_DISTRIBUTIONS: Record<string, Record<string, DistributionParams>> = {
  mortgage_amount: {
    NL: { mean: 280000, stddev: 120000, min: 50000, max: 2000000, distribution: 'lognormal' },
    DK: { mean: 260000, stddev: 110000, min: 50000, max: 1800000, distribution: 'lognormal' },
    SE: { mean: 250000, stddev: 100000, min: 50000, max: 1500000, distribution: 'lognormal' },
    LU: { mean: 350000, stddev: 150000, min: 100000, max: 2500000, distribution: 'lognormal' },
    FR: { mean: 180000, stddev: 80000, min: 40000, max: 1000000, distribution: 'lognormal' },
    DE: { mean: 220000, stddev: 90000, min: 50000, max: 1200000, distribution: 'lognormal' },
    BE: { mean: 200000, stddev: 85000, min: 50000, max: 1100000, distribution: 'lognormal' },
    ES: { mean: 130000, stddev: 60000, min: 30000, max: 800000, distribution: 'lognormal' },
    IT: { mean: 120000, stddev: 55000, min: 30000, max: 700000, distribution: 'lognormal' },
    AT: { mean: 190000, stddev: 80000, min: 50000, max: 1000000, distribution: 'lognormal' },
    IE: { mean: 240000, stddev: 100000, min: 60000, max: 1400000, distribution: 'lognormal' },
    PT: { mean: 100000, stddev: 45000, min: 25000, max: 600000, distribution: 'lognormal' },
    GR: { mean: 90000, stddev: 40000, min: 20000, max: 500000, distribution: 'lognormal' },
    FI: { mean: 170000, stddev: 70000, min: 40000, max: 900000, distribution: 'lognormal' },
    PL: { mean: 60000, stddev: 25000, min: 15000, max: 400000, distribution: 'lognormal' },
    CZ: { mean: 70000, stddev: 30000, min: 20000, max: 500000, distribution: 'lognormal' },
    HU: { mean: 45000, stddev: 20000, min: 10000, max: 300000, distribution: 'lognormal' },
    RO: { mean: 35000, stddev: 15000, min: 8000, max: 250000, distribution: 'lognormal' },
    BG: { mean: 30000, stddev: 12000, min: 8000, max: 200000, distribution: 'lognormal' },
    HR: { mean: 55000, stddev: 22000, min: 15000, max: 350000, distribution: 'lognormal' },
  },
  transaction_amount: {
    DE: { mean: 42, stddev: 35, min: 1, max: 5000, distribution: 'lognormal' },
    FR: { mean: 38, stddev: 32, min: 1, max: 5000, distribution: 'lognormal' },
    NL: { mean: 35, stddev: 28, min: 1, max: 4000, distribution: 'lognormal' },
    IT: { mean: 33, stddev: 27, min: 1, max: 4000, distribution: 'lognormal' },
    ES: { mean: 30, stddev: 25, min: 1, max: 3500, distribution: 'lognormal' },
    AT: { mean: 40, stddev: 33, min: 1, max: 4500, distribution: 'lognormal' },
    BE: { mean: 36, stddev: 30, min: 1, max: 4000, distribution: 'lognormal' },
  },
  healthcare_cost: {
    DE: { mean: 4850, stddev: 3200, min: 200, max: 50000, distribution: 'gamma' },
    FR: { mean: 4200, stddev: 2800, min: 200, max: 45000, distribution: 'gamma' },
    NL: { mean: 3800, stddev: 2500, min: 200, max: 40000, distribution: 'gamma' },
    AT: { mean: 4600, stddev: 3000, min: 200, max: 48000, distribution: 'gamma' },
    BE: { mean: 4100, stddev: 2700, min: 200, max: 42000, distribution: 'gamma' },
    IT: { mean: 3200, stddev: 2100, min: 150, max: 35000, distribution: 'gamma' },
    ES: { mean: 2900, stddev: 1900, min: 150, max: 30000, distribution: 'gamma' },
    PL: { mean: 1800, stddev: 1200, min: 100, max: 20000, distribution: 'gamma' },
  },
};
