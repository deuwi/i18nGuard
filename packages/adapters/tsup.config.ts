import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/i18next.ts',
    'src/formatjs.ts', 
    'src/lingui.ts'
  ],
  format: ['esm'],
  dts: true, // Enable TypeScript declarations
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false
});