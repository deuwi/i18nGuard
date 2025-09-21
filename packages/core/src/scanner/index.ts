import { globby } from 'globby';
import { readFile } from 'fs/promises';
import { parseCode } from '../parser';
import { DEFAULT_RULES } from '../rules';
import type { 
  I18nGuardConfig, 
  ScanResult, 
  Finding, 
  RuleContext, 
  ASTNode, 
  ScanSummary,
  CoverageReport,
  Adapter,
  Catalogs,
  TranslationCall
} from '../types';

export class Scanner {
  private config: I18nGuardConfig;
  private findings: Finding[] = [];
  private fileCount = 0;
  private adapter: Adapter | null = null;
  private catalogs: Catalogs | null = null;
  private usedKeys: Set<string> = new Set();

  constructor(config: I18nGuardConfig, adapter?: Adapter) {
    this.config = config;
    this.adapter = adapter || null;
  }

  async scan(): Promise<ScanResult> {
    const startTime = Date.now();
    this.findings = [];
    this.fileCount = 0;
    this.usedKeys.clear();

    // Load translation catalogs if adapter is available
    if (this.adapter) {
      try {
        this.catalogs = await this.adapter.loadCatalogs(this.config);
      } catch (error) {
        console.warn('Failed to load catalogs:', error);
      }
    }

    // Find all files to scan
    const files = await this.getFilesToScan();
    
    // Scan each file
    for (const file of files) {
      await this.scanFile(file);
    }

    // Check for unused keys
    if (this.adapter && this.catalogs) {
      this.checkUnusedKeys();
    }

    const scanTime = Date.now() - startTime;
    
    // Generate summary and coverage report
    const summary = this.generateSummary(scanTime);
    const coverage = await this.generateCoverageReport();

    return {
      summary,
      findings: this.findings,
      coverage
    };
  }

  async scanSingleFile(filePath: string, content?: string): Promise<ScanResult> {
    const startTime = Date.now();
    this.findings = [];
    this.fileCount = 0;
    this.usedKeys.clear();

    // Load translation catalogs if adapter is available
    if (this.adapter) {
      try {
        this.catalogs = await this.adapter.loadCatalogs(this.config);
      } catch (error) {
        console.warn('Failed to load catalogs:', error);
      }
    }

    // Scan the single file
    if (content) {
      await this.scanFileContent(filePath, content);
    } else {
      await this.scanFile(filePath);
    }

    const scanTime = Date.now() - startTime;
    
    // Generate summary and coverage report
    const summary = this.generateSummary(scanTime);
    const coverage = await this.generateCoverageReport();

    return {
      summary,
      findings: this.findings,
      coverage
    };
  }

  private async getFilesToScan(): Promise<string[]> {
    const files = await globby(this.config.src, {
      ignore: this.config.ignore,
      absolute: true
    });

    return files.filter(file => 
      file.match(/\.(ts|tsx|js|jsx)$/) && 
      !file.includes('node_modules')
    );
  }

  private async scanFile(filePath: string): Promise<void> {
    try {
      const source = await readFile(filePath, 'utf-8');
      await this.scanFileContent(filePath, source);
    } catch (error) {
      console.warn(`Failed to scan file ${filePath}:`, error);
    }
  }

  private async scanFileContent(filePath: string, source: string): Promise<void> {
    try {
      const ast = parseCode({ filePath, source });
      
      this.fileCount++;
      
      const context: RuleContext = {
        file: filePath,
        source,
        config: this.config,
        report: (finding) => {
          this.findings.push({
            ...finding,
            id: this.generateFindingId(finding)
          });
        }
      };

      // Apply all rules to the AST
      this.traverseAST(ast, context);
      
    } catch (error) {
      console.warn(`Failed to scan file content ${filePath}:`, error);
    }
  }

  private traverseAST(node: ASTNode, context: RuleContext): void {
    // Check for translation calls if we have an adapter
    if (this.adapter && this.catalogs) {
      const translationCall = this.adapter.extractTranslationCalls(node);
      if (translationCall) {
        this.checkTranslationCall(translationCall, node, context);
      }
    }

    // Apply rules to current node
    for (const rule of DEFAULT_RULES) {
      try {
        rule.check(node, context);
      } catch (error) {
        console.warn(`Rule ${rule.id} failed on ${context.file}:`, error);
      }
    }

    // Recursively traverse child nodes
    for (const key in node) {
      const value = node[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object') {
              this.traverseAST(item, context);
            }
          }
        } else {
          this.traverseAST(value, context);
        }
      }
    }
  }

  private checkTranslationCall(call: TranslationCall, node: ASTNode, context: RuleContext): void {
    if (!this.catalogs) return;

    const fullKey = call.namespace ? `${call.namespace}:${call.keyName}` : call.keyName;
    
    // Track that this key was used
    this.usedKeys.add(fullKey);

    // Check if the key exists in each locale
    for (const locale of this.config.locales) {
      const catalog = this.catalogs[locale];
      if (!catalog) continue;
      
      if (!this.keyExistsInCatalog(fullKey, catalog)) {
        context.report({
          ruleId: 'I18N002',
          severity: 'error',
          message: `Missing translation key "${fullKey}" in locale "${locale}"`,
          file: context.file,
          line: node.loc?.start.line || 0,
          column: node.loc?.start.column || 0,
          endLine: node.loc?.end.line || 0,
          endColumn: node.loc?.end.column || 0,
          source: fullKey,
          suggestion: {
            type: 'add-key',
            description: `Add missing key "${fullKey}" to ${locale} catalog`,
            keyName: fullKey,
            catalogPath: this.getCatalogPath(locale, call.namespace)
          }
        });
      }
    }
  }

  private keyExistsInCatalog(key: string, catalog: any): boolean {
    // For flattened i18next catalogs, the key should exist directly
    // e.g., catalog = {"common:buttons.submit": "Submit", "common:hello": "Hello"}
    // and key = "common:buttons.submit"
    return key in catalog;
  }

  private getCatalogPath(locale: string, namespace?: string): string {
    if (!this.config.catalogs.i18next) return '';
    
    return this.config.catalogs.i18next.pathPattern
      .replace('{locale}', locale)
      .replace('{ns}', namespace || 'common');
  }

  private checkUnusedKeys(): void {
    if (!this.catalogs) return;

    // Use the default locale as the reference for finding unused keys
    const referenceCatalog = this.catalogs[this.config.defaultLocale];
    if (!referenceCatalog) return;

    // Check each key in the reference catalog
    for (const key in referenceCatalog) {
      if (!this.usedKeys.has(key)) {
        // This key exists in catalog but was never used
        this.findings.push({
          ruleId: 'I18N003',
          severity: 'warning',
          message: `Unused translation key "${key}"`,
          file: this.getCatalogPath(this.config.defaultLocale, this.extractNamespaceFromKey(key)),
          line: 0,
          column: 0,
          source: key,
          suggestion: {
            type: 'remove-key',
            description: `Remove unused key "${key}" from catalog`,
            keyName: key
          },
          id: this.generateFindingId({
            ruleId: 'I18N003',
            severity: 'warning',
            message: `Unused translation key "${key}"`,
            file: this.getCatalogPath(this.config.defaultLocale, this.extractNamespaceFromKey(key)),
            line: 0,
            column: 0,
            source: key,
            suggestion: {
              type: 'remove-key',
              description: `Remove unused key "${key}" from catalog`,
              keyName: key
            }
          })
        });
      }
    }
  }

  private extractNamespaceFromKey(key: string): string | undefined {
    const parts = key.split(':');
    return parts.length > 1 ? parts[0] : undefined;
  }

  private generateFindingId(finding: Omit<Finding, 'id'>): string {
    // Generate a unique ID for the finding
    const hash = this.simpleHash(
      `${finding.file}:${finding.line}:${finding.column}:${finding.ruleId}`
    );
    return `${finding.ruleId}-${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private generateSummary(scanTime: number): ScanSummary {
    const summary: ScanSummary = {
      hardCoded: 0,
      missing: 0,
      unused: 0,
      icuErrors: 0,
      duplicates: 0,
      totalFiles: this.fileCount,
      scanTime
    };

    for (const finding of this.findings) {
      switch (finding.ruleId) {
        case 'I18N001':
          summary.hardCoded++;
          break;
        case 'I18N002':
        case 'I18N101':
          summary.missing++;
          break;
        case 'I18N003':
        case 'I18N102':
          summary.unused++;
          break;
        case 'I18N201':
        case 'I18N202':
          summary.icuErrors++;
          break;
      }
    }

    return summary;
  }

  private async generateCoverageReport(): Promise<CoverageReport> {
    // This would analyze translation catalogs and calculate coverage
    // For now, return a placeholder
    return {
      byLocale: {},
      overall: {
        totalKeys: 0,
        translatedKeys: 0,
        percentage: 0
      }
    };
  }
}