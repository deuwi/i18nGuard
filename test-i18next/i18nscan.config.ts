// Local type definitions (temporary workaround)
interface I18nGuardConfig {
  library: string;
  src: string[];
  locales: string[];
  defaultLocale: string;
  catalogs: Record<string, any>;
  budgets?: Record<string, any>;
  ignore?: string[];
  keygen?: Record<string, any>;
  report?: Record<string, any>;
}

export default {
  library: 'i18next',
  src: ['src/**/*.{ts,tsx}'],
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  
  catalogs: {
    i18next: {
      pathPattern: 'public/locales/{locale}/{namespace}.json',
      namespaces: ['common']
    }
  },

  budgets: {
    coverage: {
      en: 0.9,
      fr: 0.8
    },
    maxNewHardCodedPerPR: 5
  },

  ignore: [
    'node_modules/**',
    'dist/**',
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}',
    'vite.config.ts'
  ],

  keygen: {
    strategy: 'namespaceSlug',
    maxLen: 100
  },

  report: {
    formats: ['json', 'html'],
    outputDir: './i18n-reports'
  }
} satisfies I18nGuardConfig;