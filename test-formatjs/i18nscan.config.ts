export default {
  library: 'formatjs',
  src: ['src/**/*.{ts,tsx,js,jsx}'],
  locales: ['en', 'fr'],
  defaultLocale: 'en',

  catalogs: {
    formatjs: {
      messagesGlobs: [
        'public/locales/{locale}/messages.json'
      ]
    }
  },

  ignore: ['node_modules/**', 'dist/**', 'build/**'],

  keygen: {
    strategy: 'filePathSlug',
    maxLen: 80
  },

  report: {
    formats: ['json', 'html'],
    outputDir: './i18n-reports'
  },

  budgets: {
    coverage: {
      en: 0.9,
      fr: 0.8
    }
  }
}