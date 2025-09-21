import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'], // VS Code extensions need CommonJS
  dts: false,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  external: ['vscode'], // Only externalize vscode, bundle everything else
  platform: 'node',
  target: 'node16',
  bundle: true, // Bundle all dependencies
  noExternal: ['@i18nguard/core', '@i18nguard/adapters'], // Include workspace deps
  cjsInterop: true, // Ensure proper CommonJS exports
  banner: {
    js: '// VS Code Extension Bundle',
  },
});