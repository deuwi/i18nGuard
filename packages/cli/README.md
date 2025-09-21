# @i18nguard/cli (beta)

Command-line interface for i18nGuard.

## Install

```sh
npm i -g @i18nguard/cli@beta
```

## Quick start

- Create `i18nscan.config.ts` (or .js/.mjs/.cjs/.json) at project root:

```ts
export default {
  library: 'i18next', // or 'formatjs' | 'lingui' | 'auto'
  src: ['src/**/*.{ts,tsx,js,jsx}'],
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  catalogs: {
    i18next: {
      pathPattern: 'public/locales/{locale}/{ns}.json',
      namespaces: ['common']
    }
  },
  ignore: ['node_modules/**', 'dist/**'],
  keygen: { strategy: 'filePathSlug', maxLen: 60 },
  report: { formats: ['json'], outputDir: 'i18n-reports' }
}
```

- Run a scan (auto-detects config):

```sh
i18nguard scan
```

- Generate a report from a saved JSON:

```sh
i18nguard report -i i18n-reports/report.json -f html -o i18n-reports/report.html
```

## Troubleshooting

- If no files are scanned, adjust `src` globs and run from your project root.
- For i18next, ensure `catalogs.i18next.pathPattern` uses `{locale}` and `{ns}` and points to real files.
- For FormatJS, set `catalogs.formatjs.messagesGlobs` to match your message JSON files with `{locale}`.

## License

MIT
