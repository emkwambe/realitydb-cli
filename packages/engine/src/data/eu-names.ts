// ─── EU name pools (Blockers 2 + 4) ──────────────────────────────────────────
// Pure data. Country-keyed name pools with frequency weights and gender tags.
// DE and FR are full (per spec, national-statistics ordered). The remaining
// eight countries carry stub pools (≥5M + ≥5F first names, ≥5 last names) so the
// Phase 4b/4c strategies never throw. Stubs are country-plausible, not
// statistics-calibrated — flagged for later expansion.

export interface FirstNameEntry {
  name: string;
  weight: number;
  gender: 'M' | 'F';
}

export interface LastNameEntry {
  name: string;
  weight: number;
}

export interface NamePool {
  firstNames: FirstNameEntry[];
  lastNames: LastNameEntry[];
}

export const EU_NAME_POOLS: Record<string, NamePool> = {
  // ── DE (full — Destatis-ordered per spec) ──
  DE: {
    firstNames: [
      { name: 'Maximilian', weight: 0.042, gender: 'M' },
      { name: 'Alexander', weight: 0.038, gender: 'M' },
      { name: 'Paul', weight: 0.035, gender: 'M' },
      { name: 'Ben', weight: 0.033, gender: 'M' },
      { name: 'Leon', weight: 0.031, gender: 'M' },
      { name: 'Elias', weight: 0.029, gender: 'M' },
      { name: 'Noah', weight: 0.028, gender: 'M' },
      { name: 'Louis', weight: 0.026, gender: 'M' },
      { name: 'Jonas', weight: 0.025, gender: 'M' },
      { name: 'Felix', weight: 0.024, gender: 'M' },
      { name: 'Emilia', weight: 0.041, gender: 'F' },
      { name: 'Emma', weight: 0.038, gender: 'F' },
      { name: 'Sophia', weight: 0.035, gender: 'F' },
      { name: 'Hannah', weight: 0.032, gender: 'F' },
      { name: 'Mia', weight: 0.030, gender: 'F' },
      { name: 'Ella', weight: 0.028, gender: 'F' },
      { name: 'Mila', weight: 0.026, gender: 'F' },
      { name: 'Lina', weight: 0.025, gender: 'F' },
      { name: 'Lea', weight: 0.024, gender: 'F' },
      { name: 'Clara', weight: 0.022, gender: 'F' },
    ],
    lastNames: [
      { name: 'Müller', weight: 0.95 },
      { name: 'Schmidt', weight: 0.86 },
      { name: 'Schneider', weight: 0.63 },
      { name: 'Fischer', weight: 0.55 },
      { name: 'Weber', weight: 0.42 },
      { name: 'Meyer', weight: 0.39 },
      { name: 'Wagner', weight: 0.38 },
      { name: 'Becker', weight: 0.35 },
      { name: 'Schulz', weight: 0.33 },
      { name: 'Hoffmann', weight: 0.31 },
    ],
  },
  // ── FR (full — INSEE-ordered per spec) ──
  FR: {
    firstNames: [
      { name: 'Jean', weight: 0.045, gender: 'M' },
      { name: 'Pierre', weight: 0.038, gender: 'M' },
      { name: 'Michel', weight: 0.035, gender: 'M' },
      { name: 'André', weight: 0.032, gender: 'M' },
      { name: 'Philippe', weight: 0.030, gender: 'M' },
      { name: 'René', weight: 0.026, gender: 'M' },
      { name: 'Louis', weight: 0.025, gender: 'M' },
      { name: 'Alain', weight: 0.024, gender: 'M' },
      { name: 'Jacques', weight: 0.023, gender: 'M' },
      { name: 'Bernard', weight: 0.022, gender: 'M' },
      { name: 'Marie', weight: 0.052, gender: 'F' },
      { name: 'Jeanne', weight: 0.038, gender: 'F' },
      { name: 'Marguerite', weight: 0.030, gender: 'F' },
      { name: 'Lucie', weight: 0.028, gender: 'F' },
      { name: 'Édith', weight: 0.025, gender: 'F' },
      { name: 'Simone', weight: 0.024, gender: 'F' },
      { name: 'Yvonne', weight: 0.022, gender: 'F' },
      { name: 'Madeleine', weight: 0.021, gender: 'F' },
      { name: 'Catherine', weight: 0.020, gender: 'F' },
      { name: 'Nathalie', weight: 0.019, gender: 'F' },
    ],
    lastNames: [
      { name: 'Martin', weight: 0.23 },
      { name: 'Bernard', weight: 0.19 },
      { name: 'Thomas', weight: 0.18 },
      { name: 'Petit', weight: 0.16 },
      { name: 'Robert', weight: 0.15 },
      { name: 'Richard', weight: 0.14 },
      { name: 'Durand', weight: 0.13 },
      { name: 'Dubois', weight: 0.12 },
      { name: 'Moreau', weight: 0.11 },
      { name: 'Laurent', weight: 0.10 },
    ],
  },
  // ── IT (stub — expand with ISTAT data later) ──
  IT: {
    firstNames: [
      { name: 'Francesco', weight: 0.04, gender: 'M' },
      { name: 'Alessandro', weight: 0.035, gender: 'M' },
      { name: 'Lorenzo', weight: 0.03, gender: 'M' },
      { name: 'Matteo', weight: 0.028, gender: 'M' },
      { name: 'Andrea', weight: 0.025, gender: 'M' },
      { name: 'Sofia', weight: 0.04, gender: 'F' },
      { name: 'Giulia', weight: 0.035, gender: 'F' },
      { name: 'Aurora', weight: 0.03, gender: 'F' },
      { name: 'Alice', weight: 0.028, gender: 'F' },
      { name: 'Ginevra', weight: 0.025, gender: 'F' },
    ],
    lastNames: [
      { name: 'Rossi', weight: 0.5 },
      { name: 'Russo', weight: 0.4 },
      { name: 'Ferrari', weight: 0.35 },
      { name: 'Esposito', weight: 0.3 },
      { name: 'Bianchi', weight: 0.28 },
    ],
  },
  // ── ES (stub — expand with INE data later) ──
  ES: {
    firstNames: [
      { name: 'Antonio', weight: 0.04, gender: 'M' },
      { name: 'Manuel', weight: 0.035, gender: 'M' },
      { name: 'José', weight: 0.03, gender: 'M' },
      { name: 'Francisco', weight: 0.028, gender: 'M' },
      { name: 'Daniel', weight: 0.025, gender: 'M' },
      { name: 'María', weight: 0.04, gender: 'F' },
      { name: 'Carmen', weight: 0.035, gender: 'F' },
      { name: 'Lucía', weight: 0.03, gender: 'F' },
      { name: 'Ana', weight: 0.028, gender: 'F' },
      { name: 'Laura', weight: 0.025, gender: 'F' },
    ],
    lastNames: [
      { name: 'García', weight: 0.5 },
      { name: 'Rodríguez', weight: 0.4 },
      { name: 'González', weight: 0.35 },
      { name: 'Fernández', weight: 0.3 },
      { name: 'López', weight: 0.28 },
    ],
  },
  // ── NL (stub — expand with CBS data later) ──
  NL: {
    firstNames: [
      { name: 'Daan', weight: 0.04, gender: 'M' },
      { name: 'Sem', weight: 0.035, gender: 'M' },
      { name: 'Lucas', weight: 0.03, gender: 'M' },
      { name: 'Finn', weight: 0.028, gender: 'M' },
      { name: 'Bram', weight: 0.025, gender: 'M' },
      { name: 'Emma', weight: 0.04, gender: 'F' },
      { name: 'Julia', weight: 0.035, gender: 'F' },
      { name: 'Sophie', weight: 0.03, gender: 'F' },
      { name: 'Anna', weight: 0.028, gender: 'F' },
      { name: 'Tess', weight: 0.025, gender: 'F' },
    ],
    lastNames: [
      { name: 'De Jong', weight: 0.5 },
      { name: 'Jansen', weight: 0.4 },
      { name: 'De Vries', weight: 0.35 },
      { name: 'Van den Berg', weight: 0.3 },
      { name: 'Bakker', weight: 0.28 },
    ],
  },
  // ── AT (stub) ──
  AT: {
    firstNames: [
      { name: 'Lukas', weight: 0.04, gender: 'M' },
      { name: 'Tobias', weight: 0.035, gender: 'M' },
      { name: 'David', weight: 0.03, gender: 'M' },
      { name: 'Fabian', weight: 0.028, gender: 'M' },
      { name: 'Julian', weight: 0.025, gender: 'M' },
      { name: 'Anna', weight: 0.04, gender: 'F' },
      { name: 'Lena', weight: 0.035, gender: 'F' },
      { name: 'Sarah', weight: 0.03, gender: 'F' },
      { name: 'Julia', weight: 0.028, gender: 'F' },
      { name: 'Laura', weight: 0.025, gender: 'F' },
    ],
    lastNames: [
      { name: 'Gruber', weight: 0.5 },
      { name: 'Huber', weight: 0.4 },
      { name: 'Bauer', weight: 0.35 },
      { name: 'Wagner', weight: 0.3 },
      { name: 'Müller', weight: 0.28 },
    ],
  },
  // ── BE (stub) ──
  BE: {
    firstNames: [
      { name: 'Lucas', weight: 0.04, gender: 'M' },
      { name: 'Louis', weight: 0.035, gender: 'M' },
      { name: 'Arthur', weight: 0.03, gender: 'M' },
      { name: 'Noah', weight: 0.028, gender: 'M' },
      { name: 'Liam', weight: 0.025, gender: 'M' },
      { name: 'Emma', weight: 0.04, gender: 'F' },
      { name: 'Louise', weight: 0.035, gender: 'F' },
      { name: 'Marie', weight: 0.03, gender: 'F' },
      { name: 'Olivia', weight: 0.028, gender: 'F' },
      { name: 'Alice', weight: 0.025, gender: 'F' },
    ],
    lastNames: [
      { name: 'Peeters', weight: 0.5 },
      { name: 'Janssens', weight: 0.4 },
      { name: 'Maes', weight: 0.35 },
      { name: 'Jacobs', weight: 0.3 },
      { name: 'Mertens', weight: 0.28 },
    ],
  },
  // ── IE (stub) ──
  IE: {
    firstNames: [
      { name: 'Jack', weight: 0.04, gender: 'M' },
      { name: 'James', weight: 0.035, gender: 'M' },
      { name: 'Daniel', weight: 0.03, gender: 'M' },
      { name: 'Conor', weight: 0.028, gender: 'M' },
      { name: 'Seán', weight: 0.025, gender: 'M' },
      { name: 'Emily', weight: 0.04, gender: 'F' },
      { name: 'Grace', weight: 0.035, gender: 'F' },
      { name: 'Sophie', weight: 0.03, gender: 'F' },
      { name: 'Aoife', weight: 0.028, gender: 'F' },
      { name: 'Saoirse', weight: 0.025, gender: 'F' },
    ],
    lastNames: [
      { name: 'Murphy', weight: 0.5 },
      { name: 'Kelly', weight: 0.4 },
      { name: "O'Brien", weight: 0.35 },
      { name: 'Ryan', weight: 0.3 },
      { name: 'Byrne', weight: 0.28 },
    ],
  },
  // ── PL (stub) ──
  PL: {
    firstNames: [
      { name: 'Jakub', weight: 0.04, gender: 'M' },
      { name: 'Kacper', weight: 0.035, gender: 'M' },
      { name: 'Antoni', weight: 0.03, gender: 'M' },
      { name: 'Filip', weight: 0.028, gender: 'M' },
      { name: 'Jan', weight: 0.025, gender: 'M' },
      { name: 'Zuzanna', weight: 0.04, gender: 'F' },
      { name: 'Julia', weight: 0.035, gender: 'F' },
      { name: 'Maja', weight: 0.03, gender: 'F' },
      { name: 'Zofia', weight: 0.028, gender: 'F' },
      { name: 'Hanna', weight: 0.025, gender: 'F' },
    ],
    lastNames: [
      { name: 'Nowak', weight: 0.5 },
      { name: 'Kowalski', weight: 0.4 },
      { name: 'Wiśniewski', weight: 0.35 },
      { name: 'Wójcik', weight: 0.3 },
      { name: 'Kowalczyk', weight: 0.28 },
    ],
  },
  // ── SE (stub) ──
  SE: {
    firstNames: [
      { name: 'William', weight: 0.04, gender: 'M' },
      { name: 'Liam', weight: 0.035, gender: 'M' },
      { name: 'Noah', weight: 0.03, gender: 'M' },
      { name: 'Hugo', weight: 0.028, gender: 'M' },
      { name: 'Oliver', weight: 0.025, gender: 'M' },
      { name: 'Alice', weight: 0.04, gender: 'F' },
      { name: 'Maja', weight: 0.035, gender: 'F' },
      { name: 'Elsa', weight: 0.03, gender: 'F' },
      { name: 'Astrid', weight: 0.028, gender: 'F' },
      { name: 'Wilma', weight: 0.025, gender: 'F' },
    ],
    lastNames: [
      { name: 'Andersson', weight: 0.5 },
      { name: 'Johansson', weight: 0.4 },
      { name: 'Karlsson', weight: 0.35 },
      { name: 'Nilsson', weight: 0.3 },
      { name: 'Eriksson', weight: 0.28 },
    ],
  },
};
