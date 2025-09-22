# i18nGuard for VS Code

i18nGuard brings powerful internationalization (i18n) linting directly to your VS Code editor. Get real-time feedback on hard-coded strings, missing translations, and more with intelligent quick fixes.

## ✨ Features

### 🔍 **Real-time Detection**
- **Hard-coded Strings**: Automatically detects strings that should be translated
- **Missing Translation Keys**: Validates `t()` calls against loaded catalogs
- **Unused Keys**: Identifies translation keys that are never used
- **Live Updates**: Diagnostics update as you type with file watcher integration

### ⚡ **Intelligent Quick Fixes**
- **String Externalization**: One-click conversion of hard-coded strings to translation calls
- **Smart Locale Handling**: 
  - Default locale: Preserves original text value
  - Other locales: Uses `TODO:Translate(original text)` for easy translation
- **Bulk Operations**: Add all missing translation keys at once
- **Namespace Support**: Full support for i18next namespaced keys (`app:greeting`)

### 🌐 **Multi-locale Support**
- Works with any number of configured locales (en, fr, es, etc.)
- Automatically writes to all locale files simultaneously
- Intelligent locale discovery from catalog structure
- Windows path compatibility for cross-platform development

### 🛠️ **Advanced Features**
- **Configuration Discovery**: Automatically finds nearest `i18nscan.config.ts`
- **Catalog Writing**: Direct JSON file manipulation with proper formatting
- **Progress Feedback**: Clear status messages and validation
- **Error Handling**: Graceful handling of missing files and invalid configurations

## 📋 Requirements

- **VS Code**: Version 1.80 or higher
- **Project Type**: TypeScript, JavaScript, React (TSX/JSX)
- **i18n Library**: Currently supports i18next (FormatJS and Lingui coming soon)
- **Configuration**: `i18nscan.config.ts` file in your project

## 🚀 Getting Started

### Installation

1. **From VSIX** (current method):
   ```bash
   code --install-extension path/to/i18nguard-1.0.2.vsix
   ```

2. **From Marketplace** (coming soon):
   - Search "i18nGuard" in VS Code Extensions
   - Click Install

### Configuration

Create an `i18nscan.config.ts` file in your project root:

```typescript
import { defineConfig } from '@i18nguard/core';

export default defineConfig({
  library: 'i18next',
  src: ['src/**/*.{ts,tsx,js,jsx}'],
  locales: ['en', 'fr', 'es'],
  defaultLocale: 'en',
  catalogs: {
    i18next: {
      pathPattern: 'public/locales/{locale}/{ns}.json',
      namespaces: ['common', 'app']
    }
  }
});
```

### Usage

Once installed and configured, the extension works automatically:

1. **Open a TypeScript/JavaScript file**
2. **Hard-coded strings** are highlighted with red squiggly underlines
3. **Use Quick Fix** (`Ctrl+.` or `Cmd+.`) to see available actions:
   - "Externalize string" - Convert to translation call
   - "Add missing translation key" - Add key to catalogs
   - "Add all missing translation keys" - Bulk operation for multiple keys

## 🎯 Example Workflow

### Before
```tsx
function Welcome() {
  return <h1>Welcome to our app!</h1>;
}
```

### After Quick Fix
```tsx
function Welcome() {
  return <h1>{t('app:welcome')}</h1>;
}
```

### Generated Catalogs
- **en/app.json**: `{ "welcome": "Welcome to our app!" }`
- **fr/app.json**: `{ "welcome": "TODO:Translate(Welcome to our app!)" }`
- **es/app.json**: `{ "welcome": "TODO:Translate(Welcome to our app!)" }`

## 📋 Available Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `i18nGuard: Scan for i18n Issues` | Manual scan of current workspace | - |
| `i18nGuard: Generate Report` | Create HTML/JSON/SARIF reports | - |
| Quick Fix Actions | Context-sensitive fixes | `Ctrl+.` / `Cmd+.` |

## ⚙️ Configuration Options

### VS Code Settings

Search for "i18nguard" in VS Code settings or configure via `settings.json`:

```json
{
  "i18nguard.enable": true,
  "i18nguard.library": "auto",
  "i18nguard.configPath": "i18nscan.config.ts",
  "i18nguard.diagnostics.enable": true,
  "i18nguard.diagnostics.severity": "warning",
  "i18nguard.quickFix.enable": true
}
```

### Project Configuration

The extension automatically discovers and uses your `i18nscan.config.ts` configuration file. See the [main documentation](../../README.md) for complete configuration options.

## 🔄 File Watching

The extension automatically watches your translation files and rescans when they change:
- Catalog files (`public/locales/**/*.json`)
- Configuration files (`i18nscan.config.ts`)
- Source files (TypeScript/JavaScript)

## 🐛 Troubleshooting

### Common Issues

1. **No diagnostics showing**:
   - Ensure `i18nscan.config.ts` exists in your project root
   - Check that file types are supported (TS/JS/TSX/JSX)
   - Verify the extension is enabled in settings

2. **Quick fixes not working**:
   - Ensure you have write permissions to catalog directories
   - Check that catalog path pattern is correct
   - Verify locale configuration matches your file structure

3. **Windows path issues**:
   - The extension now properly handles Windows paths
   - Use forward slashes in path patterns for cross-platform compatibility

### Debug Information

Check the VS Code output panel ("i18nGuard" channel) for detailed logging and error messages.

## 🤝 Contributing

Found a bug or want to contribute? Visit our [GitHub repository](https://github.com/deuwi/i18nguard) to:
- Report issues
- Submit feature requests
- Contribute code improvements

## 📄 License

MIT © i18nGuard Team
