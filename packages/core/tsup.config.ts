import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false, // Temporarily disable DTS generation to unblock publish
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  external: ['typescript'],
  // Fix for module resolution
  bundle: true,
  skipNodeModulesBundle: true
});