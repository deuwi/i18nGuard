export default {
  library: "auto", // "i18next" | "formatjs" | "lingui" | "auto"
  src: ["src/**/*.{ts,tsx,js,jsx}"],
  locales: ["en", "fr", "es"],
  defaultLocale: "en",
  catalogs: {
    i18next: {
      pathPattern: "locales/{locale}/{ns}.json",
      namespaces: ["common", "auth", "dashboard"]
    },
    formatjs: {
      messagesGlobs: ["messages/{locale}.json"]
    },
    lingui: {
      pathPattern: "locale/{locale}/messages.json"
    }
  },
  budgets: {
    coverage: { fr: 0.95, es: 0.6 },
    maxNewHardCodedPerPR: 0
  },
  ignore: [
    "**/*.test.*",
    "**/*.spec.*",
    "**/*.stories.*",
    "scripts/**"
  ],
  keygen: {
    strategy: "filePathSlug", // "filePathSlug" | "namespaceSlug" | "hash"
    maxLen: 60
  },
  report: {
    formats: ["json", "sarif", "html"],
    outputDir: "reports/i18n"
  },
  baseline: {
    path: "reports/i18n/baseline.json",
    mode: "newIssuesOnly"
  },
};