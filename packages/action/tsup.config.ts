import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node16',
  clean: true,
  sourcemap: true,
  dts: false, // Disable DTS generation in tsup
  bundle: true,
  minify: false,
  external: [],
});