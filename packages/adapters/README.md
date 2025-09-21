# @i18nguard/adapters (beta)

Adapters for popular i18n libraries: i18next, FormatJS (react-intl), Lingui.

## Install

```sh
npm i @i18nguard/adapters@beta
```

## Usage with core

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
})

const adapter = new I18nextAdapter()
const scanner = new Scanner(config, adapter)
const result = await scanner.scan()
```

### FormatJS example

```ts
import { FormatJSAdapter } from '@i18nguard/adapters/formatjs'

const config = mergeConfig({
  library: 'formatjs',
  src: ['src/**/*.{ts,tsx,js,jsx}'],
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  catalogs: {
    formatjs: { messagesGlobs: ['public/locales/{locale}/messages.json'] }
  }
})
```

## License

MIT
