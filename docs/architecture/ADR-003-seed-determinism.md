# ADR-003: Seed Determinism — Mulberry32 PRNG in @realitydb/engine

**Date:** 2026-07-10
**Status:** Resolved — commit 38c8947
**Author:** Eddy Mkwambe

## Context

The published `realitydb run --seed N` flag was cosmetic. All generation
used raw unseeded Math.random(). Every reproducibility claim in compliance
documentation, DORA reports, and attest sign certificates was false for
the published CLI. Verified empirically: identical --seed 42 invocations
produced divergent data (1004 lines differing, different UUIDs from row 1).

A production-quality seeded PRNG (mulberry32, createSeededRandom) existed
in packages/shared/src/random.ts but was never wired into the generation
path. The shipped binary (dist/index.js, built from src/index.ts) used
@realitydb/engine exclusively, which had zero dependencies and zero PRNG
seeding.

## Decision

Inline mulberry32 directly into packages/engine/src/generators.ts to
preserve the zero-dependency contract. Do not add @databox/shared as a
dependency of @realitydb/engine.

Wire createRng(seed) through the full generation path:
- generateData(tables, rowsPerTable, pack, seed?) — new seed param
- generateMockValue(colDef, colName, tableName, rng) — rng param
- generateByStrategy(strategy, options, colName, tableName, rng) — rng param
- weightedRandom(values, weights, rng) — rng param
- randomHex(rng) — rng param (fixes UUID non-determinism)
- FK picks, temporal offsets, Poisson/cardinality draws — all use rng

Timestamp base epoch: when seed is set, derive fixed base epoch from seed
rather than Date.now(). SQL header and _realitydb_meta generated_at also
pinned when seeded. Unseeded runs fall back to Math.random()/Date.now()
for backward compatibility.

## Consequence

run --seed 42 now produces byte-identical output on every invocation.
seed 42 and seed 99 produce different output (verified: 1006 lines differ).
Unseeded runs unaffected.

The reproducibility claim in DORA reports and attest sign certificates
is now true. A compliance auditor can re-run with the same seed and
verify they get the same dataset.

## Files changed

- packages/engine/src/generators.ts — createRng, mulberry32, rng threading
- packages/engine/src/engine.ts — seed param, rng threading, base epoch
- apps/cli/src/index.ts — options.seed passed to generateData

## Verification

- V1 build: 11/11 tasks
- V2 smoke: 215/215
- V3 diff: two --seed 42 runs byte-identical (full file)
- V4: seed 42 vs seed 99 differ (1006 lines)
- V5: unseeded runs complete without error
