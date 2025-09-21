# i18nGuard for VS Code

i18nGuard brings internationalization (i18n) linting to your editor. It scans your code for hard-coded strings and other i18n issues and offers quick fixes.

## Features
- Diagnostics for hard-coded strings
- Quick fixes to externalize strings
- Configurable via `i18nscan.config.*`

## Requirements
- VS Code 1.80+
- A project supported by i18nGuard (i18next, FormatJS, or Lingui)

## How to use
- Install the extension (VSIX or Marketplace)
- Open your project; diagnostics appear automatically in TS/JS/TSX/JSX files
- Use the command palette: `i18nGuard: Scan for i18n Issues`

## Configuration
Use workspace settings (search for `i18nguard`) or an `i18nscan.config.ts` at your project root.

## Issues & Feedback
Report issues at https://github.com/deuwi/i18nguard/issues
