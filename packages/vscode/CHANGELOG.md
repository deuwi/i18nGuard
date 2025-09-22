# i18nGuard — Internationalization (i18n) Linter for JavaScript/TypeScript

A fast internationalization linter and validation tool for JS/TS projects. Supports i18next, React‑Intl (FormatJS), and Lingui. Includes a CLI, VS Code integration, GitHub Action (coming), SARIF reports, pseudo‑localization, and translation coverage budgets.

## Changelog

### v1.1.0 (Latest)
- ✨ **Universal Framework Support**: Added support for FormatJS and Lingui in addition to i18next
- 🎯 **Precise String Highlighting**: Improved diagnostics to highlight only the string literal instead of the entire function call
- 🔧 **Enhanced Catalog Writer**: Universal catalog writing system supporting all frameworks
- 📦 **Better Architecture**: Refactored adapters to capture precise AST node positions
- 🐛 **Bug Fixes**: Improved string literal detection and range calculation

### v1.0.2
- 🚀 Initial stable release with i18next support
- ✅ Real-time diagnostics and Quick Fix actions
- 📝 Smart externalization with intelligent locale handling
- 🔍 Hard-coded string detection and missing key validation

[![Sponsor](https://img.shields.io/github/sponsors/deuwi?style=social)](https://github.com/sponsors/deuwi)
[![npm version](https://img.shields.io/npm/v/@i18nguard/cli.svg)](https://www.npmjs.com/package/@i18nguard/cli)
[![npm downloads](https://img.shields.io/npm/dm/@i18nguard/cli.svg)](https://www.npmjs.com/package/@i18nguard/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#-license)

## Table of Contents
- [Features](#-features)
- [Quick Start](#-quick-start)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Usage](#usage)
- [Packages](#-packages)
- [Project Status](#-project-status)
  - [Operational Features](#-operational-features)
  - [VS Code Extension Features](#-vs-code-extension-features)
- [Examples](#-examples)
- [Rule Reference](#-rule-reference)
- [VS Code Extension](#-vs-code-extension)
- [GitHub Action](#-github-action-coming-soon)
- [Contributing](#-contributing)
- [Sponsors](#-sponsors)
- [License](#-license)

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
- **[@i18nguard/adapters](./packages/adapters)** - Framework adapters (i18next ✅, FormatJS ✅, Lingui ✅)
- **[@i18nguard/reporter](./packages/reporter)** - Report generators (JSON ✅, SARIF ✅, HTML ✅)
- **[@i18nguard/vscode](./packages/vscode)** - VS Code extension (i18next only ✅)
- **[@i18nguard/action](./packages/action)** - GitHub Action 🚧

**Legend:** ✅ Functional | 🚧 In Development

## 🎯 Project Status

### ✅ Operational Features

#### Hard-coded Detection (I18N001)
- Detects hard-coded strings in JSX elements
- Suggests appropriate translation keys
- Works with React, JSX, TSX files

#### Missing Keys Detection (I18N002)
- Validates `t()` function calls against loaded catalogs
- Checks all configured locales
- Provides specific catalog paths for fixes

#### Unused Keys Detection (I18N003)
- Identifies translation keys present in catalogs but never used
- Suggests removal to keep catalogs clean
- Works across all namespaces and nested keys

#### i18next Adapter
- Complete catalog loading with namespace support
- Proper key flattening and lookup
- `t()` function call extraction with namespace parsing
- `<Trans>` component support (being improved)

#### FormatJS Adapter
- Complete implementation for React-Intl projects
- `formatMessage()` function call detection
- `<FormattedMessage>` component support
- ICU message syntax validation
- Glob-based catalog loading

#### Lingui Adapter
- Complete implementation for Lingui projects
- Template literal and macro support
- `t()` function call extraction
- `<Trans>` component detection

### 🚧 In Development
- VS Code extension support for FormatJS and Lingui (currently i18next only)
- Complete GitHub Action
- ICU syntax validation in VS Code
- Watch mode and pseudo-localization

### ✅ VS Code Extension Features

#### Real-time Diagnostics
- Automatically detects hard-coded strings in TypeScript/JavaScript files
- Shows missing translation keys with specific locale information
- Identifies unused translation keys in catalogs
- Live updates as you type with file watcher integration

#### Intelligent Quick Fix Actions
- **String Externalization**: Converts hard-coded strings to translation calls
- **Smart Locale Handling**: Writes source text to default locale, `TODO:Translate(source)` to others
- **Bulk Operations**: Add all missing translation keys at once
- **Windows Support**: Proper path handling for Windows development

#### Advanced Features
- **Multi-locale Support**: Works with en, fr, es, and custom locale configurations
- **Namespace Awareness**: Supports i18next namespaced keys (e.g., `app:greeting`)
- **Configuration Discovery**: Automatically finds nearest `i18nscan.config.ts`
- **Catalog Writing**: Directly writes to JSON translation files
- **Progress Feedback**: Clear status messages and validation

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

#### For FormatJS/React-Intl Projects
```typescript
export default defineConfig({
  library: 'formatjs',
  src: ['src/**/*.{ts,tsx,js,jsx}'],
  locales: ['en', 'fr', 'es'],
  defaultLocale: 'en',
  catalogs: {
    formatjs: {
      messagesGlobs: ['src/locales/{locale}.json']
    }
  }
});
```

#### For Lingui Projects
```typescript
export default defineConfig({
  library: 'lingui',
  src: ['src/**/*.{ts,tsx,js,jsx}'],
  locales: ['en', 'fr', 'es'],
  defaultLocale: 'en',
  catalogs: {
    lingui: {
      pathPattern: 'src/locales/{locale}/messages.po'
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
    "@i18nguard/reporter": "file:../i18nguard/packages/reporter"
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

- [i18next + React](./examples/i18next-react) - Basic React app with i18next integration
- [VS Code Extension Usage](./packages/vscode/FEATURES.md) - Complete feature documentation with examples
- More examples coming soon...

## 🧩 VS Code Extension

The i18nGuard extension provides real-time internationalization linting directly in your VS Code editor.

### Features
- ✅ Real-time detection of hard-coded strings
- ✅ Smart Quick Fixes (one-click externalization with intelligent locale handling)
- ✅ Bulk operations (add multiple missing keys at once)
- ✅ Multi-locale support and namespace awareness
- ✅ Windows-compatible path handling

Note: The VS Code extension currently supports i18next. FormatJS and Lingui are available via the CLI.

### Installation

1. Install from the VS Code Marketplace (coming soon), or
2. Install the VSIX file directly:
   ```bash
   code --install-extension i18nguard-1.0.2.vsix
   ```

### Usage

- Hard-coded strings are highlighted automatically
- Use `Ctrl+.` (Cmd+. on Mac) for Quick Fix
- Externalization converts `"Hello World"` to `{t('app:greeting')}`
- Smart writing:
  - Default locale (en): `"Hello World"`
  - Other locales (fr, es): `"TODO:Translate(Hello World)"`

### Commands

- `i18nGuard: Scan for i18n Issues`
- `i18nGuard: Generate Report`

### Configuration

Configure via `i18nscan.config.ts` in your project root or VS Code settings.

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

- See [SPONSORS.md](./SPONSORS.md) for tiers and benefits.
- Become a sponsor via [GitHub Sponsors](https://github.com/sponsors/deuwi).

## 📄 License

MIT © i18nGuard Team