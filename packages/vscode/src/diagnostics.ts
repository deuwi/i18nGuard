import * as vscode from 'vscode';
import { Scanner } from '@i18nguard/core';
import type { ConfigLoader } from './config';

export class DiagnosticProvider {
  constructor(
    private diagnosticCollection: vscode.DiagnosticCollection,
    private configLoader: ConfigLoader
  ) {}

  async scanDocument(document: vscode.TextDocument) {
    if (!this.isEnabled()) {
      return;
    }

    try {
      const config = await this.configLoader.loadConfig();
      if (!config) {
        return;
      }

      // For now, create scanner without adapter to avoid type issues
      const scanner = new Scanner(config);
      
      // Scan the specific document
      const result = await scanner.scanSingleFile(document.uri.fsPath, document.getText());
      
      const diagnostics: vscode.Diagnostic[] = [];
      
      // Convert findings to VS Code diagnostics
      for (const finding of result.findings) {
        const range = new vscode.Range(
          new vscode.Position(finding.line - 1, finding.column - 1),
          new vscode.Position(
            (finding.endLine || finding.line) - 1, 
            (finding.endColumn || finding.column + 10) - 1
          )
        );
        
        let severity: vscode.DiagnosticSeverity;
        switch (finding.severity) {
          case 'error':
            severity = vscode.DiagnosticSeverity.Error;
            break;
          case 'warning':
            severity = vscode.DiagnosticSeverity.Warning;
            break;
          case 'info':
            severity = vscode.DiagnosticSeverity.Information;
            break;
          default:
            severity = vscode.DiagnosticSeverity.Warning;
        }
        
        const diagnostic = new vscode.Diagnostic(
          range,
          finding.message,
          severity
        );
        
        diagnostic.source = 'i18nGuard';
        diagnostic.code = finding.ruleId;
        diagnostics.push(diagnostic);
      }
      
      this.diagnosticCollection.set(document.uri, diagnostics);
      
    } catch (error) {
      console.error('Failed to scan document:', error);
    }
  }

  async scanWorkspace() {
    const config = await this.configLoader.loadConfig();
    if (!config) {
      vscode.window.showErrorMessage('Could not load i18nGuard configuration');
      return;
    }

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Scanning workspace for i18n issues...',
      cancellable: false
    }, async (progress) => {
      try {
        const scanner = new Scanner(config);
        const result = await scanner.scan();
        
        vscode.window.showInformationMessage(
          `Scan completed: ${result.findings.length} issues found in ${result.summary.totalFiles} files`
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Scan failed: ${error}`);
      }
    });
  }

  async generateReport(uri: vscode.Uri) {
    const config = await this.configLoader.loadConfig();
    if (!config) {
      throw new Error('Could not load configuration');
    }

    const scanner = new Scanner(config);
    const result = await scanner.scan();
    
    // Generate report based on file extension
    const ext = uri.path.split('.').pop()?.toLowerCase();
    let format: 'json' | 'sarif' | 'html' = 'json';
    
    switch (ext) {
      case 'html':
        format = 'html';
        break;
      case 'sarif':
        format = 'sarif';
        break;
      default:
        format = 'json';
    }
    
    // In a real implementation, we would use the reporter package
    const reportData = JSON.stringify(result, null, 2);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(reportData, 'utf8'));
  }

  private isEnabled(): boolean {
    return vscode.workspace.getConfiguration('i18nguard').get<boolean>('enable', true);
  }

  private shouldBeTranslated(text: string): boolean {
    // Skip very short strings, numbers, single characters, etc.
    if (text.length < 3) return false;
    
    // Skip if it's just whitespace
    if (!/\S/.test(text)) return false;
    
    // Skip if it's just numbers or symbols
    if (/^[\d\s\-_.,;:!?()[\]{}]+$/.test(text)) return false;
    
    // Skip common non-translatable strings
    const nonTranslatable = [
      'id', 'className', 'style', 'key', 'ref',
      'true', 'false', 'null', 'undefined',
      'onClick', 'onChange', 'onSubmit'
    ];
    
    if (nonTranslatable.includes(text)) return false;
    
    return true;
  }
}