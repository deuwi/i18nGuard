import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false, // Disable DTS generation in tsup
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false
});