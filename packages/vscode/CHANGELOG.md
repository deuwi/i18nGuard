# i18nGuard VS Code Extension - Changelog

## [1.0.2] - 2025-09-22

### ✨ Features Added
- **Smart String Externalization**: Intelligent locale handling with source text preservation
- **TODO:Translate Context**: Non-default locales get `TODO:Translate(original text)` for easy translation
- **Bulk Operations**: Add all missing translation keys at once
- **Windows Compatibility**: Proper path handling for Windows development
- **Multi-locale Support**: Automatic writing to all configured locales
- **Namespace Awareness**: Full support for i18next namespaced keys (`app:greeting`)

### 🛠️ Technical Improvements
- **Real-time Diagnostics**: Live updates as you type with file watcher integration
- **Configuration Discovery**: Automatically finds nearest `i18nscan.config.ts`
- **Catalog Writing**: Direct JSON file manipulation with proper formatting
- **Progress Feedback**: Clear status messages and validation
- **Error Handling**: Graceful handling of missing files and invalid configurations

### 🚀 Quick Fix Actions
- **String Externalization**: One-click conversion of hard-coded strings
- **Missing Key Addition**: Add translation keys to specific or all locales
- **Bulk Key Addition**: Handle multiple missing keys simultaneously
- **Smart Key Generation**: Automatic key generation based on file path and content

### 🔧 Commands Added
- `i18nguard.rescanActiveDocument` - Refresh diagnostics for current file
- `i18nguard.addMissingKey` - Add individual missing translation key
- `i18nguard.addAllMissingKeys` - Bulk add multiple missing keys

### 📋 Configuration Options
- Full VS Code settings integration
- Automatic configuration file discovery
- Support for custom path patterns and namespaces

### 🐛 Bug Fixes
- Fixed Windows path parsing issues
- Improved file system operations for cross-platform compatibility
- Enhanced error handling for edge cases

## [1.0.1] - Previous Version
- Basic diagnostic functionality
- Simple externalization support

## [1.0.0] - Initial Release
- Basic extension structure
- Core i18n detection capabilities

---

## Planned Features

### 🚧 Next Release (1.1.0)
- FormatJS adapter support
- Lingui adapter support
- Hover documentation for translation keys
- Go-to-definition for keys
- Translation preview on hover

### 🔮 Future Releases
- Interactive translation editor
- Bulk translation operations
- Integration with translation services
- Advanced key management tools
- Performance optimizations