import * as vscode from 'vscode';
import * as path from 'path';

interface CatalogEntry {
  key: string;
  value: string;
  locale: string;
  namespace?: string;
}

interface CatalogWriter {
  writeEntry(config: any, entry: CatalogEntry, contextUri: vscode.Uri): Promise<void>;
  writeEntryToLocale(config: any, key: string, value: string, contextUri: vscode.Uri, locale?: string): Promise<void>;
  writeEntryAllLocales(config: any, key: string, sourceText: string, contextUri: vscode.Uri): Promise<void>;
  generateTranslationCall(key: string, library: string): string;
}

export class UniversalCatalogWriter implements CatalogWriter {
  
  async writeEntry(config: any, entry: CatalogEntry, contextUri: vscode.Uri): Promise<void> {
    const library = config.library || 'auto';
    
    switch (library) {
      case 'i18next':
        return this.writeI18nextEntry(config, entry, contextUri);
      case 'formatjs':
        return this.writeFormatJSEntry(config, entry, contextUri);
      case 'lingui':
        return this.writeLinguiEntry(config, entry, contextUri);
      case 'auto':
        return this.writeAutoDetected(config, entry, contextUri);
      default:
        throw new Error(`Unsupported library: ${library}`);
    }
  }

  async writeEntryToLocale(config: any, key: string, value: string, contextUri: vscode.Uri, locale?: string): Promise<void> {
    const targetLocale = locale || config?.defaultLocale || 'en';
    await this.writeEntry(config, { key, value, locale: targetLocale }, contextUri);
  }

  async writeEntryAllLocales(config: any, key: string, sourceText: string, contextUri: vscode.Uri): Promise<void> {
    try {
      // Ensure we have the freshest config with locales relative to this file
      const locales: string[] = Array.isArray(config?.locales) && config.locales.length > 0 
        ? config.locales 
        : [config?.defaultLocale || 'en'];
      const defaultLocale = config?.defaultLocale || 'en';

      // Auto-discover locales if needed
      const discoveredLocales = await this.discoverLocales(config, contextUri, locales, defaultLocale);
      
      // Write to each locale - sourceText for defaultLocale, TODO:Translate(sourceText) for others
      const writtenTo: string[] = [];
      for (const loc of discoveredLocales) {
        const value = loc === defaultLocale ? sourceText : `TODO:Translate(${sourceText})`;
        await this.writeEntry(config, { key, value, locale: loc }, contextUri);
        writtenTo.push(loc);
      }
      
      if (writtenTo.length > 1) {
        vscode.window.showInformationMessage(
          `i18nGuard: Wrote key to locales: ${writtenTo.join(', ')} (${defaultLocale}: source text, others: TODO:Translate(source))`
        );
      }
    } catch (e) {
      console.error('i18nGuard: failed to write catalogs for all locales', e);
    }
  }

  generateTranslationCall(key: string, library: string): string {
    switch (library) {
      case 'i18next':
        return `{t('${key}')}`;
      case 'formatjs':
        return `{formatMessage({ id: '${key}' })}`;
      case 'lingui':
        return `{t\`${key}\`}`;
      default:
        return `{t('${key}')}`;
    }
  }

  private async discoverLocales(config: any, contextUri: vscode.Uri, configuredLocales: string[], defaultLocale: string): Promise<string[]> {
    let locales = [...configuredLocales];
    
    // If only the default locale is present, try to auto-discover sibling locale folders
    if (locales.length <= 1) {
      try {
        const discovered = await this.autoDiscoverLocales(config, contextUri, defaultLocale);
        if (discovered.length > 0) {
          const set = new Set<string>([...locales, ...discovered]);
          locales = Array.from(set);
        }
      } catch (e) {
        console.warn('i18nGuard: locale auto-discovery failed', e);
      }
    }
    
    return locales;
  }

  private async autoDiscoverLocales(config: any, contextUri: vscode.Uri, defaultLocale: string): Promise<string[]> {
    const library = config.library || 'auto';
    
    // Determine the project root
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(contextUri);
    if (!workspaceFolder) return [];
    
    let pattern: string;
    switch (library) {
      case 'i18next':
        pattern = config.catalogs?.i18next?.pathPattern || 'public/locales/{locale}/{ns}.json';
        break;
      case 'formatjs':
        pattern = config.catalogs?.formatjs?.messagesGlobs?.[0] || 'src/locales/{locale}.json';
        break;
      case 'lingui':
        pattern = config.catalogs?.lingui?.pathPattern || 'src/locales/{locale}/messages.po';
        break;
      default:
        return [];
    }
    
    // Extract directory structure from pattern
    const localeIndex = pattern.indexOf('{locale}');
    if (localeIndex === -1) return [];
    
    const beforeLocale = pattern.substring(0, localeIndex);
    const localesRoot = vscode.Uri.joinPath(workspaceFolder.uri, beforeLocale);
    
    try {
      const entries = await vscode.workspace.fs.readDirectory(localesRoot);
      return entries
        .filter(([, type]) => type === vscode.FileType.Directory)
        .map(([name]) => name)
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  private async writeI18nextEntry(config: any, entry: CatalogEntry, contextUri: vscode.Uri): Promise<void> {
    try {
      // Determine project root
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(contextUri);
      if (!workspaceFolder) return;

      const defaultLocale: string = config.defaultLocale || 'en';
      
      // Support namespaced keys like "ns:key.path"; default to 'common' namespace
      let ns = 'common';
      let pureKey = entry.key;
      const colonIdx = entry.key.indexOf(':');
      if (colonIdx > 0) {
        ns = entry.key.slice(0, colonIdx);
        pureKey = entry.key.slice(colonIdx + 1);
      }
      
      const pattern: string = config.catalogs?.i18next?.pathPattern || 'public/locales/{locale}/{ns}.json';
      const resolvedPattern = pattern.replace('{locale}', entry.locale).replace('{ns}', ns);
      const isAbsolute = /^(?:[a-zA-Z]:[\\/]|\\\\|\/)/.test(resolvedPattern);
      
      let fileUri: vscode.Uri;
      if (isAbsolute) {
        fileUri = vscode.Uri.file(resolvedPattern);
      } else {
        const segments = resolvedPattern.split(/[\\/]+/).filter(Boolean);
        fileUri = vscode.Uri.joinPath(workspaceFolder.uri, ...segments);
      }

      // Read existing JSON or start fresh
      let obj: any = {};
      try {
        const buf = await vscode.workspace.fs.readFile(fileUri);
        const str = Buffer.from(buf).toString('utf8') || '{}';
        obj = JSON.parse(str);
      } catch {
        obj = {};
      }

      // Set nested value for dot-separated key (without namespace)
      const parts = pureKey.split('.');
      this.setNested(obj, parts, entry.value);

      const pretty = JSON.stringify(obj, null, 2);

      // Ensure directory exists
      const parentFsPath = path.dirname(fileUri.fsPath);
      const dirUri = vscode.Uri.file(parentFsPath);
      try { await vscode.workspace.fs.createDirectory(dirUri); } catch {}

      await vscode.workspace.fs.writeFile(fileUri, Buffer.from(pretty, 'utf8'));
      vscode.window.setStatusBarMessage(`i18nGuard: wrote ${ns} → ${entry.locale} at ${fileUri.fsPath}`, 3000);
    } catch (e) {
      console.error('i18nGuard: failed to write i18next catalog', e);
      vscode.window.showErrorMessage(`i18nGuard: Failed to write catalog entry: ${String((e as any)?.message || e)}`);
    }
  }

  private async writeFormatJSEntry(config: any, entry: CatalogEntry, contextUri: vscode.Uri): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(contextUri);
      if (!workspaceFolder) return;

      // FormatJS typically uses flat key-value structure
      const messagesGlobs = config.catalogs?.formatjs?.messagesGlobs || [`src/locales/{locale}.json`];
      const pattern = messagesGlobs[0].replace('{locale}', entry.locale);
      
      const isAbsolute = /^(?:[a-zA-Z]:[\\/]|\\\\|\/)/.test(pattern);
      let fileUri: vscode.Uri;
      
      if (isAbsolute) {
        fileUri = vscode.Uri.file(pattern);
      } else {
        const segments = pattern.split(/[\\/]+/).filter(Boolean);
        fileUri = vscode.Uri.joinPath(workspaceFolder.uri, ...segments);
      }

      // Read existing JSON or start fresh
      let obj: any = {};
      try {
        const buf = await vscode.workspace.fs.readFile(fileUri);
        const str = Buffer.from(buf).toString('utf8') || '{}';
        obj = JSON.parse(str);
      } catch {
        obj = {};
      }

      // FormatJS uses flat keys or dot notation
      obj[entry.key] = entry.value;

      const pretty = JSON.stringify(obj, null, 2);

      // Ensure directory exists
      const parentFsPath = path.dirname(fileUri.fsPath);
      const dirUri = vscode.Uri.file(parentFsPath);
      try { await vscode.workspace.fs.createDirectory(dirUri); } catch {}

      await vscode.workspace.fs.writeFile(fileUri, Buffer.from(pretty, 'utf8'));
      vscode.window.setStatusBarMessage(`i18nGuard: wrote FormatJS → ${entry.locale} at ${fileUri.fsPath}`, 3000);
    } catch (e) {
      console.error('i18nGuard: failed to write FormatJS catalog', e);
      vscode.window.showErrorMessage(`i18nGuard: Failed to write FormatJS catalog entry: ${String((e as any)?.message || e)}`);
    }
  }

  private async writeLinguiEntry(config: any, entry: CatalogEntry, contextUri: vscode.Uri): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(contextUri);
      if (!workspaceFolder) return;

      // Lingui can use .po files or .json files
      const pattern = config.catalogs?.lingui?.pathPattern || `src/locales/{locale}/messages.po`;
      const resolvedPattern = pattern.replace('{locale}', entry.locale);
      
      const isAbsolute = /^(?:[a-zA-Z]:[\\/]|\\\\|\/)/.test(resolvedPattern);
      let fileUri: vscode.Uri;
      
      if (isAbsolute) {
        fileUri = vscode.Uri.file(resolvedPattern);
      } else {
        const segments = resolvedPattern.split(/[\\/]+/).filter(Boolean);
        fileUri = vscode.Uri.joinPath(workspaceFolder.uri, ...segments);
      }

      const isPoFile = fileUri.fsPath.endsWith('.po');
      
      if (isPoFile) {
        // Handle .po file format
        await this.writeLinguiPoEntry(fileUri, entry);
      } else {
        // Handle .json file format
        await this.writeLinguiJsonEntry(fileUri, entry);
      }

      vscode.window.setStatusBarMessage(`i18nGuard: wrote Lingui → ${entry.locale} at ${fileUri.fsPath}`, 3000);
    } catch (e) {
      console.error('i18nGuard: failed to write Lingui catalog', e);
      vscode.window.showErrorMessage(`i18nGuard: Failed to write Lingui catalog entry: ${String((e as any)?.message || e)}`);
    }
  }

  private async writeLinguiPoEntry(fileUri: vscode.Uri, entry: CatalogEntry): Promise<void> {
    // Read existing .po file or create new one
    let content = '';
    try {
      const buf = await vscode.workspace.fs.readFile(fileUri);
      content = Buffer.from(buf).toString('utf8');
    } catch {
      // Create new .po file header
      content = `# Lingui translation file
msgid ""
msgstr ""
"Content-Type: text/plain; charset=utf-8\\n"
"Language: ${entry.locale}\\n"

`;
    }

    // Check if entry already exists
    const msgidPattern = new RegExp(`^msgid "${entry.key.replace(/"/g, '\\"')}"$`, 'm');
    if (msgidPattern.test(content)) {
      // Update existing entry
      const entryPattern = new RegExp(`(msgid "${entry.key.replace(/"/g, '\\"')}"\\n)msgstr ".*?"`, 'm');
      content = content.replace(entryPattern, `$1msgstr "${entry.value.replace(/"/g, '\\"')}"`);
    } else {
      // Add new entry
      content += `msgid "${entry.key.replace(/"/g, '\\"')}"
msgstr "${entry.value.replace(/"/g, '\\"')}"

`;
    }

    // Ensure directory exists
    const parentFsPath = path.dirname(fileUri.fsPath);
    const dirUri = vscode.Uri.file(parentFsPath);
    try { await vscode.workspace.fs.createDirectory(dirUri); } catch {}

    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
  }

  private async writeLinguiJsonEntry(fileUri: vscode.Uri, entry: CatalogEntry): Promise<void> {
    // Read existing JSON or start fresh
    let obj: any = {};
    try {
      const buf = await vscode.workspace.fs.readFile(fileUri);
      const str = Buffer.from(buf).toString('utf8') || '{}';
      obj = JSON.parse(str);
    } catch {
      obj = {};
    }

    // Lingui JSON format
    obj[entry.key] = entry.value;

    const pretty = JSON.stringify(obj, null, 2);

    // Ensure directory exists
    const parentFsPath = path.dirname(fileUri.fsPath);
    const dirUri = vscode.Uri.file(parentFsPath);
    try { await vscode.workspace.fs.createDirectory(dirUri); } catch {}

    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(pretty, 'utf8'));
  }

  private async writeAutoDetected(config: any, entry: CatalogEntry, contextUri: vscode.Uri): Promise<void> {
    // Auto-detect based on configuration
    if (config.catalogs?.i18next) {
      return this.writeI18nextEntry({ ...config, library: 'i18next' }, entry, contextUri);
    } else if (config.catalogs?.formatjs) {
      return this.writeFormatJSEntry({ ...config, library: 'formatjs' }, entry, contextUri);
    } else if (config.catalogs?.lingui) {
      return this.writeLinguiEntry({ ...config, library: 'lingui' }, entry, contextUri);
    } else {
      throw new Error('Could not auto-detect i18n library from configuration');
    }
  }

  private setNested(obj: any, path: string[], value: any): void {
    let cur = obj;
    for (let i = 0; i < path.length - 1; i++) {
      const k = path[i];
      if (typeof cur[k] !== 'object' || cur[k] === null) {
        cur[k] = {};
      }
      cur = cur[k];
    }
    cur[path[path.length - 1]] = value;
  }
}