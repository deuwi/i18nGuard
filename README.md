# i18nGuard

A comprehensive i18n linting and validation tool for JavaScript/TypeScript projects supporting i18next, React-Intl (FormatJS), and Lingui.
![Sponsor](https://img.shields.io/github/sponsors/deuwi?style=social)

## ✨ Features

🔍 **Smart Detection**: Automatically detects hard-coded strings in your UI components  
📊 **Multi-Framework**: Supports i18next, React-Intl (FormatJS), and Lingui  
🚀 **VS Code Integration**: Real-time diagnostics and quick-fix actions  
⚡ **CI/CD Ready**: GitHub Action with SARIF reporting and PR comments  
🌐 **Pseudo-localization**: Built-in pseudo-localization for testing  
📈 **Coverage Budgets**: Set and enforce translation coverage thresholds  

## 🚀 Quick Start

### Installation

```bash
# Install CLI globally
npm install -g @i18nguard/cli

# Or install in your project
npm install --save-dev @i18nguard/cli
```

### Configuration

Create an `i18nscan.config.ts` file in your project root:

```typescript
import { defineConfig } from '@i18nguard/core';

export default defineConfig({
  library: 'i18next', // or 'formatjs' or 'lingui' or 'auto'
  src: ['src/**/*.{ts,tsx,js,jsx}'],
  locales: ['en', 'fr', 'es'],
  defaultLocale: 'en',
  catalogs: {
    i18next: {
      pathPattern: 'public/locales/{locale}/{ns}.json',
      namespaces: ['common', 'auth', 'dashboard']
    }
  },
  budgets: {
    coverage: {
      fr: 95, // Require 95% coverage for French
      es: 80  // Require 80% coverage for Spanish
    },
    maxNewHardCodedPerPR: 0
  },
  ignore: ['**/*.test.*', '**/node_modules/**'],
  keygen: {
    strategy: 'filePathSlug',
    maxLen: 60
  },
  report: {
    formats: ['json', 'html'],
    outputDir: 'reports/i18n'
  }
});
```

### Usage

```bash
# Scan your project
i18nguard scan

# Generate reports
i18nguard scan --format json --output results.json
i18nguard report --input results.json --format html --output report.html

# Create pseudo-localization (coming soon)
i18nguard pseudoloc

# Watch mode for development (coming soon)
i18nguard watch
```

## 📦 Packages

This monorepo contains the following packages:

- **[@i18nguard/core](./packages/core)** - Core engine and rule system ✅
- **[@i18nguard/cli](./packages/cli)** - Command-line interface ✅
- **[@i18nguard/adapters](./packages/adapters)** - Framework adapters (i18next ✅, FormatJS 🚧, Lingui 🚧)
- **[@i18nguard/reporter](./packages/reporter)** - Report generators (JSON ✅, SARIF ✅, HTML ✅)
- **[@i18nguard/vscode](./packages/vscode)** - VS Code extension 🚧
- **[@i18nguard/action](./packages/action)** - GitHub Action 🚧

**Legend:** ✅ Functional | 🚧 In Development

## 🎯 Project Status

### ✅ **Operational Features**

#### **Hard-coded Detection (I18N001)**
- Detects hard-coded strings in JSX elements
- Suggests appropriate translation keys
- Works with React, JSX, TSX files

#### **Missing Keys Detection (I18N002)**
- Validates `t()` function calls against loaded catalogs
- Checks all configured locales
- Provides specific catalog paths for fixes

#### **Unused Keys Detection (I18N003)**
- Identifies translation keys present in catalogs but never used
- Suggests removal to keep catalogs clean
- Works across all namespaces and nested keys

#### **i18next Adapter**
- Complete catalog loading with namespace support
- Proper key flattening and lookup
- `t()` function call extraction with namespace parsing
- `<Trans>` component support (being improved)

### 🚧 **In Development**
- FormatJS and Lingui adapters
- VS Code extension with real-time diagnostics
- Complete GitHub Action
- ICU syntax validation
- Watch mode and pseudo-localization

## 📋 Examples

### Test Results from Real Project

```bash
✔ Scan completed: 7 issues found in 2 files

📊 Summary:
  Hard-coded strings: 3    # Strings that need translation
  Missing keys: 2          # Keys used in code but missing from catalogs
  Unused keys: 2           # Keys in catalogs but never used
  ICU errors: 0
  Scan time: 25ms
```

### Configuration Examples

#### For Next.js Projects
```typescript
export default defineConfig({
  library: 'i18next',
  src: ['pages/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
  catalogs: {
    i18next: {
      pathPattern: 'public/locales/{locale}/{ns}.json',
      namespaces: ['common', 'navigation']
    }
  }
});
```

#### For Create React App
```typescript
export default defineConfig({
  library: 'i18next',
  src: ['src/**/*.{ts,tsx,js,jsx}'],
  catalogs: {
    i18next: {
      pathPattern: 'src/locales/{locale}.json', // No namespaces
      namespaces: ['translation']
    }
  }
});
```

#### For Vite/React Projects
```typescript
export default defineConfig({
  library: 'i18next',
  src: ['src/**/*.{ts,tsx}'],
  catalogs: {
    i18next: {
      pathPattern: 'src/assets/locales/{locale}/{ns}.json',
      namespaces: ['common']
    }
  }
});
```

## 🔧 Installation on Another Project

### Method 1: pnpm link (Recommended for development)

```bash
# In i18nGuard directory
cd packages/cli && pnpm link --global
cd ../core && pnpm link --global
cd ../adapters && pnpm link --global
cd ../reporter && pnpm link --global

# In your target project
pnpm link --global @i18nguard/cli
pnpm link --global @i18nguard/core
pnpm link --global @i18nguard/adapters
pnpm link --global @i18nguard/reporter
```

### Method 2: Local file installation

```json
// In your project's package.json
{
  "devDependencies": {
    "@i18nguard/cli": "file:../i18nGuard/packages/cli",
    "@i18nguard/core": "file:../i18nGuard/packages/core",
    "@i18nguard/adapters": "file:../i18nGuard/packages/adapters",
    "@i18nguard/reporter": "file:../i18nGuard/packages/reporter"
  }
}
```

## 🛠️ Integration in package.json

```json
{
  "scripts": {
    "i18n:check": "i18nguard scan",
    "i18n:report": "i18nguard scan --format json --output i18n-results.json",
    "i18n:html": "i18nguard report --input i18n-results.json --format html --output i18n-report.html",
    "i18n:ci": "i18nguard scan --fail-on-error"
  }
}
```

## 📖 Examples

- **[i18next + React](./examples/i18next-react)** - Basic React app with i18next
- More examples coming soon...

## 🔍 Rule Reference

| Rule ID | Description | Severity | Status |
|---------|-------------|----------|--------|
| I18N001 | Hard-coded string detected | Warning | ✅ |
| I18N002 | Missing translation key | Error | ✅ |
| I18N003 | Unused translation key | Warning | ✅ |
| I18N201 | ICU syntax error | Error | 🚧 |
| I18N202 | ICU missing plural forms | Warning | 🚧 |

## 🚧 VS Code Extension (Coming Soon)

The i18nGuard extension will provide:

- Real-time detection of hard-coded strings
- Quick-fix actions to externalize strings
- Hover documentation and rule explanations
- Go-to-definition for translation keys

## ⚡ GitHub Action (Coming Soon)

Add i18nGuard to your CI/CD pipeline:

```yaml
name: i18n Validation
on: [push, pull_request]

jobs:
  i18n:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: i18nguard/action@v1
        with:
          fail-on-error: true
          comment-pr: true
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 🫶 Sponsors
If you or your company find i18nGuard useful, consider sponsoring to support ongoing development.

    See SPONSORS.md for tiers and benefits.
    Become a sponsor via GitHub Sponsors.

## 📄 License

MIT © i18nGuard Team