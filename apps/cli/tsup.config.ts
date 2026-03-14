import { defineConfig } from 'tsup';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: false,
  dts: false,
  define: {
    '__PKG_VERSION__': JSON.stringify(pkg.version),
  },
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