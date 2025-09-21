import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/extension.ts',
    'src/test/runTest.ts',
    'src/test/suite/index.ts',
    'src/test/suite/**/*.test.ts',
  ],
  format: ['cjs'], // VS Code extensions need CommonJS
  dts: false,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  external: ['vscode', '@vscode/test-electron', 'mocha'], // External test deps and vscode
  platform: 'node',
  target: 'node16',
  bundle: true, // Bundle all dependencies
  noExternal: ['@i18nguard/core', '@i18nguard/adapters'], // Include workspace deps
  cjsInterop: true, // Ensure proper CommonJS exports
  banner: {
    js: '// VS Code Extension Bundle',
  },
});