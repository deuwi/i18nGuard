import { defineConfig } from '@i18nguard/core'

export default defineConfig({
  // Adapter configuration for FormatJS/react-intl
  adapter: 'formatjs',
  
  // Source files to scan
  include: ['src/**/*.{ts,tsx,js,jsx}'],
  exclude: ['node_modules/**', 'dist/**', 'build/**'],
  
  // Translation catalog configuration
  catalogs: {
    en: 'public/locales/en/messages.json',
    fr: 'public/locales/fr/messages.json'
  },
  
  // Default locale
  defaultLocale: 'en',
  
  // Rules configuration
  rules: {
    'no-hardcoded-strings': {
      enabled: true,
      // Ignore certain strings
      ignore: [
        /^[\s\W]*$/, // Whitespace and non-word characters
        /^\d+$/, // Numbers only
        /^[A-Z_]+$/, // Constants
      ]
    },
    'missing-translation': {
      enabled: true
    },
    'unused-translation': {
      enabled: true
    },
    'icu-syntax': {
      enabled: true
    }
  },
  
  // Reporter configuration
  reporter: {
    type: 'console',
    options: {
      verbose: true
    }
  }
})