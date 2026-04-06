import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  target: 'es2020',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: false,
  dts: true,
});
