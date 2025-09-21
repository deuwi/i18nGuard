import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true, // Enable DTS generation in tsup
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  external: ['typescript'],
  // Fix for module resolution
  bundle: true,
  skipNodeModulesBundle: true
});