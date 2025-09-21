# @i18nguard/core (beta)

Core engine and rule system for i18nGuard.

## Install

```sh
npm i @i18nguard/core
```

## Usage

Programmatic API example:

```ts
import { Scanner, mergeConfig } from '@i18nguard/core'
import { I18nextAdapter } from '@i18nguard/adapters/i18next'

const config = mergeConfig({
  library: 'i18next',
  src: ['src/**/*.{ts,tsx,js,jsx}'],
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  catalogs: {
    i18next: {
      pathPattern: 'public/locales/{locale}/{ns}.json',
      namespaces: ['common']
    }
  },
  keygen: { strategy: 'filePathSlug', maxLen: 60 },
  report: { formats: ['json'], outputDir: 'i18n-reports' },
  budgets: { coverage: { en: 0.9, fr: 0.8 } },
  ignore: ['node_modules/**', 'dist/**']
})

const adapter = new I18nextAdapter()
const scanner = new Scanner(config, adapter)
const result = await scanner.scan()
console.log(result.summary)
```

## Config shape

See `I18nGuardConfig` in `src/types/index.ts` for full shape.

## License

MIT
