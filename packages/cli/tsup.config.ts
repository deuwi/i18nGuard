import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  dts: false, // Disable DTS generation in tsup
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  shims: true
});