import { defineConfig } from '../../packages/core/src/index.js';

export default defineConfig({
  library: 'i18next',
  src: ['src/**/*.{ts,tsx}'],
  locales: ['en', 'fr', 'es'],
  defaultLocale: 'en',
  catalogs: {
    i18next: {
      pathPattern: 'public/locales/{locale}/{ns}.json',
      namespaces: ['common', 'home', 'about']
    }
  },
  budgets: {
    coverage: {
      fr: 95, // 95% coverage required for French
      es: 80  // 80% coverage required for Spanish
    },
    maxNewHardCodedPerPR: 0
  },
  ignore: [
    '**/*.test.*',
    '**/*.spec.*',
    '**/node_modules/**'
  ],
  keygen: {
    strategy: 'filePathSlug',
    maxLen: 60
  },
  report: {
    formats: ['json', 'html'],
    outputDir: 'reports/i18n'
  }
});