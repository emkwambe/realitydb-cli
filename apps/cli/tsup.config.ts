import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: false,
  dts: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
  noExternal: [
    '@databox/config',
    '@databox/core',
    '@databox/db',
    '@databox/generators',
    '@databox/schema',
    '@databox/shared',
    '@databox/templates',
    'commander',
  ],
  external: ['pg'],
});
