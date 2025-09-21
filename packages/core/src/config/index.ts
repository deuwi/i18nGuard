import type { I18nGuardConfig } from '../types';

export function defineConfig(config: I18nGuardConfig): I18nGuardConfig {
  return config;
}

export const defaultConfig: Partial<I18nGuardConfig> = {
  library: 'auto',
  src: ['src/**/*.{ts,tsx,js,jsx}'],
  locales: ['en'],
  defaultLocale: 'en',
  ignore: [
    '**/*.test.*',
    '**/*.spec.*', 
    '**/*.stories.*',
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**'
  ],
  keygen: {
    strategy: 'filePathSlug',
    maxLen: 60
  },
  report: {
    formats: ['json'],
    outputDir: 'reports/i18n'
  },
  budgets: {
    coverage: {}
  }
};

export function mergeConfig(userConfig: Partial<I18nGuardConfig>): I18nGuardConfig {
  return {
    ...defaultConfig,
    ...userConfig,
    keygen: {
      ...defaultConfig.keygen,
      ...userConfig.keygen
    },
    report: {
      ...defaultConfig.report,
      ...userConfig.report
    },
    budgets: {
      ...defaultConfig.budgets,
      ...userConfig.budgets,
      coverage: {
        ...defaultConfig.budgets?.coverage,
        ...userConfig.budgets?.coverage
      }
    },
    catalogs: {
      ...userConfig.catalogs
    }
  } as I18nGuardConfig;
}