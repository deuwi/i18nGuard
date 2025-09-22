import * as vscode from 'vscode';
import * as path from 'path';
import type { ConfigLoader } from './config';
import { UniversalCatalogWriter } from './catalogWriter';

export class CodeActionProvider implements vscode.CodeActionProvider {
  private catalogWriter: UniversalCatalogWriter;

  constructor(private configLoader: ConfigLoader) {
    this.catalogWriter = new UniversalCatalogWriter();
  }

  async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeAction[]> {
    const actions: vscode.CodeAction[] = [];

    // Only provide actions for i18nGuard diagnostics
    const i18nDiagnostics = context.diagnostics.filter(
      diagnostic => diagnostic.source === 'i18nGuard'
    );

    if (i18nDiagnostics.length === 0) {
      return actions;
    }

    // Group missing key diagnostics by the key to offer bulk actions
    const missingKeysByKey = new Map<string, { locales: string[], diagnostics: vscode.Diagnostic[] }>();
    const otherDiagnostics: vscode.Diagnostic[] = [];

    for (const diagnostic of i18nDiagnostics) {
      const code = typeof diagnostic.code === 'string' ? diagnostic.code : String(diagnostic.code ?? '');
      if (code === 'I18N002') {
        // Extract key and locale from diagnostic message
        const keyMatch = /Missing translation key ['"]([^'"]+)['"]/.exec(diagnostic.message || '');
        const localeMatch = /locale\s+['"]([^'"]+)['"]/.exec(diagnostic.message || '');
        const key = keyMatch?.[1];
        const locale = localeMatch?.[1];
        
        if (key && locale) {
          if (!missingKeysByKey.has(key)) {
            missingKeysByKey.set(key, { locales: [], diagnostics: [] });
          }
          const entry = missingKeysByKey.get(key)!;
          if (!entry.locales.includes(locale)) {
            entry.locales.push(locale);
          }
          entry.diagnostics.push(diagnostic);
        } else {
          // Fallback: individual action for this diagnostic
          const title = locale ? `Add missing translation key (${locale})` : 'Add missing translation key';
          const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
          action.diagnostics = [diagnostic];
          action.command = {
            command: 'i18nguard.addMissingKey',
            title: title,
            arguments: [document.uri, diagnostic.range, locale]
          };
          actions.push(action);
        }
      } else {
        otherDiagnostics.push(diagnostic);
      }
    }

    // Create bulk actions for missing keys
    for (const [key, { locales, diagnostics }] of missingKeysByKey) {
      if (locales.length > 1) {
        // Multiple locales missing -> offer bulk action
        const title = `Add '${key}' to all missing locales (${locales.join(', ')})`;
        const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        action.diagnostics = diagnostics; // Include all diagnostics for this key
        action.command = {
          command: 'i18nguard.addMissingKey',
          title: title,
          arguments: [document.uri, diagnostics[0].range, locales] // Pass array of locales
        };
        action.isPreferred = true; // Make bulk action preferred
        actions.push(action);
        
        // Also add individual actions for each locale
        for (let i = 0; i < locales.length; i++) {
          const locale = locales[i];
          const title = `Add '${key}' to ${locale} only`;
          const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
          action.diagnostics = [diagnostics[i]];
          action.command = {
            command: 'i18nguard.addMissingKey',
            title: title,
            arguments: [document.uri, diagnostics[i].range, locale]
          };
          actions.push(action);
        }
      } else {
        // Single locale missing -> individual action
        const locale = locales[0];
        const title = `Add '${key}' to ${locale}`;
        const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        action.diagnostics = diagnostics;
        action.command = {
          command: 'i18nguard.addMissingKey',
          title: title,
          arguments: [document.uri, diagnostics[0].range, locale]
        };
        actions.push(action);
      }
    }

    // Add global "Add all missing translation keys" action ONLY if there are multiple different keys
    if (missingKeysByKey.size > 1) {
      const allMissingKeys = Array.from(missingKeysByKey.entries()).map(([key, { locales }]) => ({
        key,
        locales
      }));
      
      const totalMissingCount = allMissingKeys.reduce((sum, { locales }) => sum + locales.length, 0);
      const title = `Add all missing translation keys (${allMissingKeys.length} keys, ${totalMissingCount} missing entries)`;
      
      const globalAction = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
      globalAction.diagnostics = i18nDiagnostics.filter(d => 
        (typeof d.code === 'string' ? d.code : String(d.code ?? '')) === 'I18N002'
      );
      globalAction.command = {
        command: 'i18nguard.addAllMissingKeys',
        title: title,
        arguments: [document.uri, allMissingKeys]
      };
      globalAction.isPreferred = true;
      actions.unshift(globalAction); // Add at the beginning as preferred option
    }

    // Handle other diagnostics (non-missing-key)
    for (const diagnostic of otherDiagnostics) {
      // Hard-coded string or other -> externalize
      const action = new vscode.CodeAction(
        'Externalize string',
        vscode.CodeActionKind.QuickFix
      );
      action.isPreferred = true;
      action.diagnostics = [diagnostic];
      action.command = {
        command: 'i18nguard.externalizeString',
        title: 'Externalize string',
        arguments: [document.uri, diagnostic.range]
      };
      actions.push(action);
    }

    return actions;
  }

  async externalizeString(uri: vscode.Uri, range: vscode.Range) {
    try {
      // Ensure config is loaded relative to the active document to set correct project root
      await this.configLoader.loadConfig(uri);

      const document = await vscode.workspace.openTextDocument(uri);
      const result = await this.createExternalizationEdit(document, range);

      if (!result) {
        // Either user cancelled input or config missing
        return;
      }

  const { edit, key, sourceText, config } = result;

      const applied = await vscode.workspace.applyEdit(edit);
      if (!applied) {
        vscode.window.showWarningMessage('i18nGuard: Could not apply the edit.');
        return;
      }

  // Write key to catalogs for ALL configured locales
  await this.catalogWriter.writeEntryAllLocales(config, key, sourceText, uri);

  // Refresh diagnostics so the missing-key warning disappears immediately
  try { await vscode.commands.executeCommand('i18nguard.rescanActiveDocument', uri); } catch {}
  vscode.window.showInformationMessage('i18nGuard: String externalized in all locales.');
    } catch (err: any) {
      vscode.window.showErrorMessage(`i18nGuard: Failed to externalize string: ${err?.message ?? err}`);
    }
  }

  async addMissingKey(uri: vscode.Uri, range: vscode.Range, localeOrLocales?: string | string[]) {
    try {
      await this.configLoader.loadConfig(uri);
      const document = await vscode.workspace.openTextDocument(uri);
      const text = document.getText(range);

      // Try to extract key from t('...') or <Trans i18nKey="...">
      const keyFromT = /\bt\(\s*['"]([^'\"]+)['"]/m.exec(text)?.[1];
      const keyFromTrans = /<Trans[^>]*\bi18nKey=\s*['"]([^'\"]+)['"]/m.exec(text)?.[1];
      const initialKey = keyFromT || keyFromTrans || '';

      if (!initialKey) {
        vscode.window.showWarningMessage('i18nGuard: Could not detect key from selection.');
        return;
      }

      const confirmedKey = await vscode.window.showInputBox({
        prompt: 'Enter translation key to add',
        value: initialKey,
        validateInput: (value) => {
          if (!value || value.trim().length === 0) return 'Key cannot be empty';
          if (!/^[a-zA-Z0-9._:-]+$/.test(value)) return 'Key can only contain letters, numbers, dots, underscores, hyphens, and optional namespace prefix (ns:key)';
          return undefined;
        }
      });
      if (!confirmedKey) return;

      // Handle both single locale and multiple locales
      const targetLocales = Array.isArray(localeOrLocales) ? localeOrLocales : (localeOrLocales ? [localeOrLocales] : []);
      const config = await this.configLoader.loadConfig(uri);
      const defaultLocale = config?.defaultLocale || 'en';

      if (targetLocales.length === 0) {
        // No specific locales -> add to default locale with TODO:Translate
        await this.catalogWriter.writeEntryToLocale(config, confirmedKey, 'TODO:Translate', uri);
        vscode.window.showInformationMessage(`i18nGuard: Added translation key "${confirmedKey}".`);
      } else if (targetLocales.length === 1) {
        // Single locale
        await this.catalogWriter.writeEntryToLocale(config, confirmedKey, 'TODO:Translate', uri, targetLocales[0]);
        vscode.window.showInformationMessage(`i18nGuard: Added translation key "${confirmedKey}" to ${targetLocales[0]}.`);
      } else {
        // Multiple locales -> add to all with TODO:Translate
        for (const locale of targetLocales) {
          await this.catalogWriter.writeEntryToLocale(config, confirmedKey, 'TODO:Translate', uri, locale);
        }
        vscode.window.showInformationMessage(`i18nGuard: Added translation key "${confirmedKey}" to ${targetLocales.length} locales: ${targetLocales.join(', ')}.`);
      }

      // Refresh diagnostics to reflect the new key
      try { await vscode.commands.executeCommand('i18nguard.rescanActiveDocument', uri); } catch {}
    } catch (err: any) {
      vscode.window.showErrorMessage(`i18nGuard: Failed to add key: ${err?.message ?? err}`);
    }
  }

  async addAllMissingKeys(uri: vscode.Uri, missingKeys: Array<{ key: string, locales: string[] }>) {
    try {
      await this.configLoader.loadConfig(uri);
      const config = await this.configLoader.loadConfig(uri);
      const defaultLocale = config?.defaultLocale || 'en';
      
      let totalAdded = 0;
      const summary: string[] = [];

      for (const { key, locales } of missingKeys) {
        for (const locale of locales) {
          await this.catalogWriter.writeEntryToLocale(config, key, 'TODO:Translate', uri, locale);
          totalAdded++;
        }
        summary.push(`${key}: ${locales.join(', ')}`);
      }

      // Refresh diagnostics to reflect all new keys
      try { await vscode.commands.executeCommand('i18nguard.rescanActiveDocument', uri); } catch {}
      
      vscode.window.showInformationMessage(
        `i18nGuard: Added ${totalAdded} missing translation entries for ${missingKeys.length} keys.\n\n${summary.join('\n')}`
      );
    } catch (err: any) {
      vscode.window.showErrorMessage(`i18nGuard: Failed to add missing keys: ${err?.message ?? err}`);
    }
  }

  private async createExternalizationEdit(
    document: vscode.TextDocument,
    range: vscode.Range
  ): Promise<
    | {
        edit: vscode.WorkspaceEdit;
        key: string;
        sourceText: string;
        config: any;
      }
    | undefined
  > {
    // Load config based on the current document to honor nearest project config
    const config = await this.configLoader.loadConfig(document.uri);
    if (!config) {
      return undefined;
    }

    const text = document.getText(range);
  const keyName = this.generateKey(text, document.fileName, config);
    
    // Show input box for key name confirmation
    const confirmedKey = await vscode.window.showInputBox({
      prompt: 'Enter translation key',
      value: keyName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Key cannot be empty';
        }
        if (!/^[a-zA-Z0-9._:-]+$/.test(value)) {
          return 'Key can only contain letters, numbers, dots, underscores, hyphens, and optional namespace prefix (ns:key)';
        }
        // If a namespace is provided, ensure it is not trailing only (e.g., "app:" must be followed by a key)
        const colonIdx = value.indexOf(':');
        if (colonIdx >= 0 && colonIdx === value.length - 1) {
          return 'Add a key after the namespace (e.g., app:welcome)';
        }
        return undefined;
      }
    });

    if (!confirmedKey) {
      return undefined;
    }

    const edit = new vscode.WorkspaceEdit();
    
    // Replace the hard-coded string with a translation call
    const replacement = this.catalogWriter.generateTranslationCall(confirmedKey, config.library);
    edit.replace(document.uri, range, replacement);

    // TODO: Add the key to the translation catalog
    // This would require finding the catalog file and adding the entry

    return { edit, key: confirmedKey, sourceText: text, config };
  }

  private generateKey(text: string, filePath: string, config: any): string {
    const fileName = filePath.split(/[\/\\]/).pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || 'unknown';
    const fileNs = fileName.toLowerCase();
    const textSlug = text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const maxLen = config.keygen?.maxLen || 60;
    if (config.library === 'i18next' || config.library === 'auto') {
      // For i18next, prefill with lowercase file name followed by ':' and let the user type the rest
      return `${fileNs}:`.substring(0, maxLen);
    }

    return `${fileName}.${textSlug}`.substring(0, maxLen);
  }

  private setNested(obj: any, path: string[], value: any) {
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