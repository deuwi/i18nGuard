# @i18nguard/reporter (beta)

Reports for i18nGuard: JSON, SARIF, HTML.

## Install

```sh
npm i @i18nguard/reporter@beta
```

## Usage

```ts
import { generateReport } from '@i18nguard/reporter'

// result: ScanResult from @i18nguard/core
await generateReport(result, 'json', 'i18n-reports/report.json')
await generateReport(result, 'html', 'i18n-reports/report.html')
```

## License

MIT
