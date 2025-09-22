# i18nGuard VS Code Extension - Features Documentation

## 🎯 Core Features

### Real-time Diagnostics

The extension provides instant feedback as you type:

- **Hard-coded String Detection (I18N001)**: Identifies strings that should be translated
- **Missing Translation Keys (I18N002)**: Validates `t()` function calls against loaded catalogs
- **Unused Translation Keys (I18N003)**: Finds translation keys that are never used in code

### Intelligent Quick Fix Actions

#### String Externalization
Convert hard-coded strings to translation calls with smart locale handling:

**Before:**
```tsx
<button>Click me!</button>
```

**After Quick Fix:**
```tsx
<button>{t('app:clickMe')}</button>
```

**Generated Catalogs:**
- `en/app.json`: `{ "clickMe": "Click me!" }`
- `fr/app.json`: `{ "clickMe": "TODO:Translate(Click me!)" }`
- `es/app.json`: `{ "clickMe": "TODO:Translate(Click me!)" }`

#### Missing Key Addition
Add missing translation keys to all configured locales:

**Code with missing key:**
```tsx
{t('app:newFeature')}  // ❌ Key missing in catalogs
```

**Quick Fix Result:**
- All locale files get the new key
- Non-default locales use `TODO:Translate` placeholder

#### Bulk Operations
Handle multiple missing keys at once:

**Multiple missing keys:**
```tsx
{t('app:title')}     // ❌ Missing
{t('app:subtitle')}  // ❌ Missing  
{t('app:button')}    // ❌ Missing
```

**Single Quick Fix:**
- "Add all missing translation keys (3 keys, 9 missing entries)"
- Adds all keys to all locales simultaneously

## 🌐 Multi-locale Support

### Intelligent Locale Handling

The extension automatically:
1. Discovers all configured locales from your config
2. Writes to the appropriate catalog files
3. Uses smart value assignment:
   - **Default locale**: Original text value
   - **Other locales**: `TODO:Translate(original text)`

### Auto-discovery

If only default locale is configured, the extension can auto-discover sibling locale directories:

```
public/locales/
├── en/app.json     ← Default locale
├── fr/app.json     ← Auto-discovered
└── es/app.json     ← Auto-discovered
```

### Namespace Support

Full support for i18next namespaced keys:

```tsx
{t('common:welcome')}        // ✅ Namespace: common
{t('auth:login.title')}      // ✅ Namespace: auth, nested key
{t('dashboard:stats.total')} // ✅ Namespace: dashboard, nested key
```

**Catalog Structure:**
```
public/locales/en/
├── common.json     ← { "welcome": "Welcome!" }
├── auth.json       ← { "login": { "title": "Login" } }
└── dashboard.json  ← { "stats": { "total": "Total" } }
```

## 🛠️ Advanced Features

### Configuration Discovery

The extension automatically finds and loads configuration:

1. **Nearest Config**: Walks up directory tree from current file
2. **Project Root**: Falls back to workspace root
3. **VS Code Settings**: Uses extension settings as fallback

### File Watching

Real-time updates when files change:

- **Catalog Files**: `**/public/locales/**/*.json`
- **Config Files**: `i18nscan.config.ts`
- **Source Files**: All TypeScript/JavaScript files

### Windows Compatibility

Proper handling of Windows paths:
- Uses `vscode.Uri.fsPath` for file system operations
- Handles both forward and backslashes in path patterns
- Case-insensitive file operations where appropriate

### Error Handling

Graceful error handling for:
- Missing configuration files
- Invalid JSON in catalog files
- Permission issues when writing files
- Network drive access issues

## 🎛️ Configuration Options

### Extension Settings

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

```typescript
// i18nscan.config.ts
import { defineConfig } from '@i18nguard/core';

export default defineConfig({
  library: 'i18next',
  src: ['src/**/*.{ts,tsx,js,jsx}'],
  locales: ['en', 'fr', 'es'],
  defaultLocale: 'en',
  catalogs: {
    i18next: {
      pathPattern: 'public/locales/{locale}/{ns}.json',
      namespaces: ['common', 'app', 'auth']
    }
  },
  keygen: {
    strategy: 'filePathSlug',
    maxLen: 60
  }
});
```

## 🔄 Workflow Examples

### Basic Externalization Workflow

1. **Write hard-coded string:**
   ```tsx
   <h1>Welcome to our app</h1>
   ```

2. **See red squiggly underline** (diagnostic appears)

3. **Use Quick Fix** (`Ctrl+.`):
   - Choose "Externalize string"
   - Confirm or edit the generated key (`app:welcome`)

4. **Result:**
   ```tsx
   <h1>{t('app:welcome')}</h1>
   ```

5. **Catalogs updated automatically:**
   - `en/app.json`: `{ "welcome": "Welcome to our app" }`
   - `fr/app.json`: `{ "welcome": "TODO:Translate(Welcome to our app)" }`
   - `es/app.json`: `{ "welcome": "TODO:Translate(Welcome to our app)" }`

### Missing Key Resolution Workflow

1. **Use undefined translation key:**
   ```tsx
   {t('auth:forgotPassword')}
   ```

2. **See error diagnostic** (missing key highlighted)

3. **Use Quick Fix**:
   - Choose "Add 'auth:forgotPassword' to all missing locales"
   - Or "Add 'auth:forgotPassword' to en only"

4. **Keys added to appropriate files:**
   - `en/auth.json`: `{ "forgotPassword": "TODO:Translate" }`
   - `fr/auth.json`: `{ "forgotPassword": "TODO:Translate" }`

### Bulk Operation Workflow

1. **Multiple missing keys in component:**
   ```tsx
   function LoginForm() {
     return (
       <form>
         <h1>{t('auth:title')}</h1>
         <input placeholder={t('auth:emailPlaceholder')} />
         <button>{t('auth:submitButton')}</button>
       </form>
     );
   }
   ```

2. **See multiple diagnostics** (all keys missing)

3. **Use Bulk Quick Fix**:
   - Choose "Add all missing translation keys (3 keys, 9 missing entries)"

4. **All keys added simultaneously** to all locale files

## 🚀 Performance Features

### Optimized Scanning
- Incremental updates on file changes
- Debounced scanning to avoid excessive operations
- Smart caching of configuration and catalog data

### Memory Management
- Proper disposal of file watchers
- Clean resource cleanup on extension deactivation
- Efficient diagnostic collection management

### Background Operations
- Non-blocking file I/O operations
- Asynchronous catalog writing
- Progressive status updates

## 🐛 Troubleshooting

### Common Issues

**No diagnostics appearing:**
- Check file type is supported (TS/JS/TSX/JSX)
- Verify `i18nscan.config.ts` exists and is valid
- Check extension is enabled in settings

**Quick fixes not working:**
- Ensure write permissions to catalog directories
- Verify path patterns in configuration
- Check catalog directories exist

**Windows-specific issues:**
- Use forward slashes in path patterns
- Check file permissions on network drives
- Verify case sensitivity settings

### Debug Information

Enable debug logging by checking the VS Code Output panel:
1. Open Output panel (`Ctrl+Shift+U`)
2. Select "i18nGuard" from dropdown
3. Review detailed operation logs