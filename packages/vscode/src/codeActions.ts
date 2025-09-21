import * as vscode from 'vscode';
import type { ConfigLoader } from './config';

export class CodeActionProvider implements vscode.CodeActionProvider {
  constructor(private configLoader: ConfigLoader) {}

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

    for (const diagnostic of i18nDiagnostics) {
      if (diagnostic.code === 'I18N001') {
        // Hard-coded string - offer externalization
        const action = new vscode.CodeAction(
          'Externalize string',
          vscode.CodeActionKind.QuickFix
        );
        
        action.edit = await this.createExternalizationEdit(document, diagnostic.range);
        action.diagnostics = [diagnostic];
        actions.push(action);
      }
    }

    return actions;
  }

  async externalizeString(uri: vscode.Uri, range: vscode.Range) {
    const document = await vscode.workspace.openTextDocument(uri);
    const edit = await this.createExternalizationEdit(document, range);
    
    if (edit) {
      await vscode.workspace.applyEdit(edit);
    }
  }

  private async createExternalizationEdit(
    document: vscode.TextDocument,
    range: vscode.Range
  ): Promise<vscode.WorkspaceEdit | undefined> {
    const config = await this.configLoader.loadConfig();
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
        if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
          return 'Key can only contain letters, numbers, dots, underscores, and hyphens';
        }
        return null;
      }
    });

    if (!confirmedKey) {
      return undefined;
    }

    const edit = new vscode.WorkspaceEdit();
    
    // Replace the hard-coded string with a translation call
    const replacement = this.generateTranslationCall(confirmedKey, config.library);
    edit.replace(document.uri, range, replacement);

    // TODO: Add the key to the translation catalog
    // This would require finding the catalog file and adding the entry

    return edit;
  }

  private generateKey(text: string, filePath: string, config: any): string {
    const fileName = filePath.split(/[/\\]/).pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || 'unknown';
    const textSlug = text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    return `${fileName}.${textSlug}`.substring(0, config.keygen?.maxLen || 60);
  }

  private generateTranslationCall(key: string, library: string): string {
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
}