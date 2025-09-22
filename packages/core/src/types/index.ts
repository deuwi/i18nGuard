export interface I18nGuardConfig {
  /** The i18n library being used */
  library: 'i18next' | 'formatjs' | 'lingui' | 'auto';
  
  /** Source files to scan */
  src: string[];
  
  /** Supported locales */
  locales: string[];
  
  /** Default/reference locale */
  defaultLocale: string;
  
  /** Catalog configuration per library */
  catalogs: {
    i18next?: {
      pathPattern: string;
      namespaces: string[];
    };
    formatjs?: {
      messagesGlobs: string[];
    };
    lingui?: {
      pathPattern: string;
    };
  };
  
  /** Coverage and quality budgets */
  budgets: {
    coverage: Record<string, number>;
    maxNewHardCodedPerPR?: number;
  };
  
  /** Files/patterns to ignore */
  ignore: string[];
  
  /** Key generation strategy */
  keygen: {
    strategy: 'filePathSlug' | 'namespaceSlug' | 'hash';
    maxLen: number;
  };
  
  /** Report configuration */
  report: {
    formats: ('json' | 'sarif' | 'html')[];
    outputDir: string;
  };
  
  /** Baseline configuration for CI */
  baseline?: {
    path: string;
    mode: 'strict' | 'newIssuesOnly';
  };
}

export interface ScanResult {
  summary: ScanSummary;
  findings: Finding[];
  coverage: CoverageReport;
}

export interface ScanSummary {
  hardCoded: number;
  missing: number;
  unused: number;
  icuErrors: number;
  duplicates: number;
  totalFiles: number;
  scanTime: number;
}

export interface Finding {
  id: string;
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  source: string;
  suggestion?: FixSuggestion;
  metadata?: Record<string, any>;
}

export interface FixSuggestion {
  type: 'externalize' | 'add-key' | 'remove-key' | 'fix-icu';
  description: string;
  keyName?: string;
  replacement?: string;
  catalogPath?: string;
}

export interface CoverageReport {
  byLocale: Record<string, LocaleCoverage>;
  overall: {
    totalKeys: number;
    translatedKeys: number;
    percentage: number;
  };
}

export interface LocaleCoverage {
  totalKeys: number;
  translatedKeys: number;
  missingKeys: string[];
  percentage: number;
  budgetMet: boolean;
  requiredCoverage?: number;
}

export interface ASTNode {
  type: string;
  start: number;
  end: number;
  loc: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  [key: string]: any;
}

export interface RuleContext {
  file: string;
  source: string;
  config: I18nGuardConfig;
  report: (finding: Omit<Finding, 'id'>) => void;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  category: 'hard-coded' | 'missing' | 'unused' | 'icu' | 'duplicate';
  check: (node: ASTNode, context: RuleContext) => void;
}

export interface Adapter {
  name: string;
  detect: (config: I18nGuardConfig) => boolean;
  loadCatalogs: (config: I18nGuardConfig) => Promise<Catalogs>;
  extractTranslationCalls: (node: ASTNode) => TranslationCall | null;
  generateKey: (text: string, filePath: string, config: I18nGuardConfig) => string;
}

export interface Catalogs {
  [locale: string]: Catalog;
}

export interface Catalog {
  [key: string]: string | NestedCatalog;
}

export interface NestedCatalog {
  [key: string]: string | NestedCatalog;
}

export interface TranslationCall {
  keyName: string;
  namespace?: string;
  defaultValue?: string;
  variables?: string[];
  component?: string;
  keyNode?: ASTNode; // Node containing the key string for precise highlighting
}