export default {
  library: 'auto',
  src: ['*.tsx', '*.ts', '*.jsx', '*.js'],
  locales: ['en', 'fr', 'es'],
  defaultLocale: 'en',
  catalogs: {},
  budgets: {
    coverage: {
      en: 100,
      fr: 90,
      es: 90
    }
  },
  ignore: ['node_modules/**'],
  keygen: {
    strategy: 'filePathSlug',
    maxLen: 50
  },
  report: {
    formats: ['json'],
    outputDir: './reports'
  }
};