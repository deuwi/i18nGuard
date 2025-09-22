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
- **[@i18nguard/vscode](./packages/vscode)** - VS Code extension ✅
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
- Complete GitHub Action
- ICU syntax validation
- Watch mode and pseudo-localization

### ✅ **VS Code Extension Features**

#### **Real-time Diagnostics**
- Automatically detects hard-coded strings in TypeScript/JavaScript files
- Shows missing translation keys with specific locale information
- Identifies unused translation keys in catalogs
- Live updates as you type with file watcher integration

#### **Intelligent Quick Fix Actions**
- **String Externalization**: Converts hard-coded strings to translation calls
- **Smart Locale Handling**: Writes source text to default locale, `TODO:Translate(source)` to others
- **Bulk Operations**: Add all missing translation keys at once
- **Windows Support**: Proper path handling for Windows development

#### **Advanced Features**
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

- **[i18next + React](./examples/i18next-react)** - Basic React app with i18next integration
- **[VS Code Extension Usage](./packages/vscode/FEATURES.md)** - Complete feature documentation with examples
- More examples coming soon...

### Live Demo with VS Code Extension

1. **Install the extension** from VSIX:
   ```bash
   code --install-extension packages/vscode/i18nguard-1.0.2.vsix
   ```

2. **Open example project**:
   ```bash
   cd examples/i18next-react
   code .
   ```

3. **See the extension in action**:
   - Hard-coded strings are highlighted automatically
   - Use `Ctrl+.` for Quick Fix actions
   - Watch as translation files are updated in real-time

## 🔍 Rule Reference

| Rule ID | Description | Severity | Status |
|---------|-------------|----------|--------|
| I18N001 | Hard-coded string detected | Warning | ✅ |
| I18N002 | Missing translation key | Error | ✅ |
| I18N003 | Unused translation key | Warning | ✅ |
| I18N201 | ICU syntax error | Error | 🚧 |
| I18N202 | ICU missing plural forms | Warning | 🚧 |

## � VS Code Extension

The i18nGuard extension provides real-time internationalization linting directly in your VS Code editor.

### Features

✅ **Real-time Detection**: Automatically highlights hard-coded strings as you type  
✅ **Smart Quick Fixes**: One-click externalization with intelligent locale handling  
✅ **Bulk Operations**: Add multiple missing translation keys at once  
✅ **Multi-locale Support**: Writes to all configured locales simultaneously  
✅ **Windows Compatible**: Proper path handling for Windows development  
✅ **Namespace Aware**: Full support for i18next namespaced keys  

### Installation

1. Install the extension from the VS Code Marketplace (coming soon)
2. Or install the VSIX file directly:
   ```bash
   code --install-extension i18nguard-1.0.2.vsix
   ```

### Usage

The extension works automatically once installed:

- **Detection**: Hard-coded strings are highlighted with squiggly underlines
- **Quick Fix**: Use `Ctrl+.` (Cmd+. on Mac) to see available fixes
- **Externalization**: Converts `"Hello World"` to `{t('app:greeting')}`
- **Smart Writing**: 
  - Default locale (en): `"Hello World"`
  - Other locales (fr, es): `"TODO:Translate(Hello World)"`

### Commands

- `i18nGuard: Scan for i18n Issues` - Manual scan of current workspace
- `i18nGuard: Generate Report` - Create HTML/JSON/SARIF reports

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

    See SPONSORS.md for tiers and benefits.
    Become a sponsor via GitHub Sponsors.

## 📄 License

MIT © i18nGuard Team