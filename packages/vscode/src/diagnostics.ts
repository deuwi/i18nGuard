import * as vscode from 'vscode';
import * as path from 'path';
import { Scanner } from '@i18nguard/core';
import { detectAdapter } from '@i18nguard/adapters';
import type { ConfigLoader } from './config';

export class DiagnosticProvider {
  constructor(
    private diagnosticCollection: vscode.DiagnosticCollection,
    private configLoader: ConfigLoader
  ) {}

  private output = vscode.window.createOutputChannel('i18nGuard');

  async scanDocument(document: vscode.TextDocument) {
    if (!this.isEnabled()) {
      return;
    }

    try {
      const loaded = await this.configLoader.loadConfig(document.uri);
      if (!loaded) {
        return;
      }
      // Clone config to avoid mutating cached object
      const config: any = {
        ...loaded,
        catalogs: {
          ...loaded.catalogs,
          i18next: loaded.catalogs?.i18next ? { ...loaded.catalogs.i18next } : undefined
        }
      };

      // Resolve catalog pathPattern relative to nearest config directory (project root)
      const configDir = this.configLoader.getLastConfigDir?.();
      if (config.catalogs?.i18next?.pathPattern && configDir) {
        const pat = config.catalogs.i18next.pathPattern;
        if (!pat.match(/^([a-zA-Z]:\\|\\\\|\/)/)) { // relative path on Win/Unix
          const folderPath = configDir.fsPath;
          const normPat = pat.replace(/[\\/]+/g, path.sep);
          config.catalogs.i18next.pathPattern = path.join(folderPath, normPat);
        }
      }

      // Debug: log resolved pattern and check presence of current-doc namespaces
      try {
        if (configDir) {
          this.output.appendLine(`[i18nGuard] Config dir: ${configDir.fsPath}`);
        }
        if (config.catalogs?.i18next?.pathPattern) {
          this.output.appendLine(`[i18nGuard] Resolved pathPattern: ${config.catalogs.i18next.pathPattern}`);
        }
        const text = document.getText();
        const nsMatches = new Set<string>();
        const tCall = /\bt\(\s*['"]([A-Za-z0-9_.-]+):/g; // ns:key in t('ns:key')
        const transAttr = /<Trans[^>]*\bi18nKey=\s*['"]([A-Za-z0-9_.-]+):/g; // ns:key
        let m: RegExpExecArray | null;
        while ((m = tCall.exec(text))) nsMatches.add(m[1]);
        while ((m = transAttr.exec(text))) nsMatches.add(m[1]);

        // Force-load these namespaces in addition to configured + discovered ones
        if (config.catalogs?.i18next) {
          const existing = new Set<string>(config.catalogs.i18next.namespaces || []);
          for (const ns of nsMatches) existing.add(ns);
          config.catalogs.i18next.namespaces = Array.from(existing);
        }

        if (config.catalogs?.i18next?.pathPattern && nsMatches.size > 0) {
          const localesToCheck = Array.isArray(config.locales) && config.locales.length > 0
            ? config.locales
            : [config.defaultLocale || 'en'];
          for (const ns of nsMatches) {
            for (const loc of localesToCheck) {
              const p = config.catalogs.i18next.pathPattern
                .replace('{locale}', loc)
                .replace('{ns}', ns);
              this.output.appendLine(`[i18nGuard] Using catalog path: ${p}`);
              try {
                await vscode.workspace.fs.stat(vscode.Uri.file(p));
                this.output.appendLine(`[i18nGuard] OK: ${ns}.json exists for ${loc}`);
              } catch {
                this.output.appendLine(`[i18nGuard] MISSING: ${ns}.json for ${loc}`);
              }
            }
          }
        }
      } catch {}

      // Create scanner with detected adapter so we can check missing keys against catalogs
      // Use all configured locales so diagnostics indicate which locales are missing
      if (Array.isArray(config.locales)) {
        this.output.appendLine(`[i18nGuard] Locales to check: ${config.locales.join(', ')}`);
      }
      const adapter = detectAdapter(config);
      const scanner = new Scanner(config as any, adapter as any);
      
      // Scan the specific document
  const result = await scanner.scanSingleFile(document.uri.fsPath, document.getText());

  // Post-filter: if a finding says missing for the default locale but the key exists in the
  // default-locale catalog file, drop that finding (guards against mis-resolved namespaces).
  const filteredFindings = await this.filterFalseMissingInDefaultLocale(result.findings, config);
      
      const diagnostics: vscode.Diagnostic[] = [];
      
      // Convert findings to VS Code diagnostics
  for (const finding of filteredFindings) {
        const startPos = new vscode.Position(
          (finding.line ?? 1) - 1,
          (finding.column ?? 1) - 1
        );
        const endLineIdx = (finding.endLine ?? finding.line ?? 1) - 1;
        // Interpret endColumn as 1-based inclusive; VS Code Range expects end exclusive 0-based
        const endCol1BasedInclusive = finding.endColumn ?? ((finding.column ?? 1) + 10);
        const endCol0BasedExclusive = endCol1BasedInclusive; // convert to 0-based exclusive
        const endPos = new vscode.Position(endLineIdx, endCol0BasedExclusive);

        const initialRange = new vscode.Range(startPos, endPos);

        // For missing translation keys, try to highlight only the string literal
        let range = initialRange;
        if (finding.ruleId === 'I18N002' && finding.source) {
          range = this.findStringLiteralRange(document, initialRange, finding.source) || initialRange;
        }

        // Trim whitespace/newlines from range so we only underline the actual text
        range = this.trimRange(document, range);
        
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

  /**
   * Remove I18N002 findings that claim the key is missing in the default locale when
   * we can verify the key is present in the resolved catalog JSON.
   */
  private async filterFalseMissingInDefaultLocale(findings: any[], config: any): Promise<any[]> {
    try {
      const def = config.defaultLocale || 'en';
      const pathPattern: string | undefined = config.catalogs?.i18next?.pathPattern;
      if (!pathPattern) return findings;

      const results: any[] = [];
      for (const f of findings) {
        if (f.ruleId !== 'I18N002') {
          results.push(f);
          continue;
        }
        // Parse message: Missing translation key "ns:keyPath" in locale "loc"
        const m = /Missing translation key "([^"]+)" in locale "([^"]+)"/.exec(f.message || '');
        if (!m) {
          results.push(f);
          continue;
        }
        const fullKey = m[1];
        const loc = m[2];
        if (loc !== def) {
          results.push(f);
          continue;
        }
        const ns = fullKey.includes(':') ? fullKey.split(':')[0] : undefined;
        const keyPath = fullKey.includes(':') ? fullKey.split(':').slice(1).join(':') : fullKey;
        if (!ns) {
          results.push(f);
          continue;
        }
        const catalogPath = pathPattern.replace('{locale}', def).replace('{ns}', ns);
        try {
          const buf = await vscode.workspace.fs.readFile(vscode.Uri.file(catalogPath));
          const json = JSON.parse(Buffer.from(buf).toString('utf8'));
          if (this.jsonHasKey(json, keyPath)) {
            // Key exists in default locale; drop this false-positive finding
            continue;
          }
        } catch {
          // If we can't read/parse, keep the finding
        }
        results.push(f);
      }
      return results;
    } catch {
      return findings;
    }
  }

  private jsonHasKey(obj: any, keyPath: string): boolean {
    try {
      const parts = keyPath.split('.');
      let cur: any = obj;
      for (const p of parts) {
        if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
          cur = cur[p];
        } else {
          return false;
        }
      }
      return typeof cur === 'string' || typeof cur === 'number' || typeof cur === 'boolean';
    } catch {
      return false;
    }
  }

  async scanWorkspace() {
    const loaded = await this.configLoader.loadConfig();
    if (!loaded) {
      vscode.window.showErrorMessage('Could not load i18nGuard configuration');
      return;
    }
    const config: any = {
      ...loaded,
      catalogs: {
        ...loaded.catalogs,
        i18next: loaded.catalogs?.i18next ? { ...loaded.catalogs.i18next } : undefined
      }
    };

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Scanning workspace for i18n issues...',
      cancellable: false
    }, async (progress) => {
      try {
        // Resolve catalog pathPattern relative to nearest config directory (best-effort: first workspace)
        const configDir = this.configLoader.getLastConfigDir?.();
        if (config.catalogs?.i18next?.pathPattern && configDir) {
          const pat = config.catalogs.i18next.pathPattern;
          if (!pat.match(/^([a-zA-Z]:\\|\\\\|\/)/)) {
            const folderPath = configDir.fsPath;
            const normPat = pat.replace(/[\\/]+/g, path.sep);
            config.catalogs.i18next.pathPattern = path.join(folderPath, normPat);
          }
        }

        const adapter = detectAdapter(config);
        const scanner = new Scanner(config as any, adapter as any);
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
    const loaded = await this.configLoader.loadConfig();
    if (!loaded) {
      throw new Error('Could not load configuration');
    }
    const config: any = {
      ...loaded,
      catalogs: {
        ...loaded.catalogs,
        i18next: loaded.catalogs?.i18next ? { ...loaded.catalogs.i18next } : undefined
      }
    };

    // Resolve catalog pathPattern relative to nearest config directory
    const configDir = this.configLoader.getLastConfigDir?.();
    if (config.catalogs?.i18next?.pathPattern && configDir) {
      const pat = config.catalogs.i18next.pathPattern;
      if (!pat.match(/^([a-zA-Z]:\\|\\\\|\/)/)) {
        const folderPath = configDir.fsPath;
        const normPat = pat.replace(/[\\/]+/g, path.sep);
        config.catalogs.i18next.pathPattern = path.join(folderPath, normPat);
      }
    }

    const adapter = detectAdapter(config);
    const scanner = new Scanner(config as any, adapter as any);
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

  /**
   * Trim leading/trailing whitespace (including newlines) from the given range.
   * If the range text is all whitespace, returns the original range.
   */
  private trimRange(document: vscode.TextDocument, range: vscode.Range): vscode.Range {
    try {
      const text = document.getText(range);
      if (!text) return range;

      // Find first non-whitespace and last non-whitespace indices
      // Trim leading whitespace and a possible leading '>' from an opening tag (e.g., <p>Text)
      let startIdx = text.search(/[^\s>]/);
      if (startIdx === -1) {
        // All whitespace — keep original to avoid zero-length range
        return range;
      }

      let endIdx = text.length - 1;
      while (endIdx >= 0 && /\s/.test(text[endIdx])) endIdx--;
      if (endIdx < startIdx) return range;

      const baseOffset = document.offsetAt(range.start);
      const newStart = document.positionAt(baseOffset + startIdx);
      const newEnd = document.positionAt(baseOffset + endIdx + 1); // end is exclusive
      return new vscode.Range(newStart, newEnd);
    } catch {
      return range;
    }
  }

  /**
   * Find the precise range of a string literal within a broader range
   */
  private findStringLiteralRange(document: vscode.TextDocument, searchRange: vscode.Range, targetString: string): vscode.Range | null {
    try {
      const text = document.getText(searchRange);
      
      // Look for the string literal with quotes: 'targetString' or "targetString"
      const patterns = [
        `'${targetString}'`,
        `"${targetString}"`,
        `\`${targetString}\``
      ];
      
      for (const pattern of patterns) {
        const index = text.indexOf(pattern);
        if (index !== -1) {
          // Calculate positions relative to the search range
          const baseOffset = document.offsetAt(searchRange.start);
          const startOffset = baseOffset + index + 1; // +1 to skip the opening quote
          const endOffset = startOffset + targetString.length;
          
          const startPos = document.positionAt(startOffset);
          const endPos = document.positionAt(endOffset);
          
          return new vscode.Range(startPos, endPos);
        }
      }
      
      return null;
    } catch {
      return null;
    }
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