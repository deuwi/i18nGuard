// Temporary type definitions until @i18nguard/core declarations are properly generated
interface I18nGuardConfig {
  library: 'i18next' | 'formatjs' | 'lingui' | 'auto';
  src: string[];
  locales: string[];
  defaultLocale: string;
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
  keygen: {
    strategy: 'filePathSlug' | 'namespaceSlug' | 'hash';
    maxLen: number;
  };
  budgets: {
    coverage: Record<string, number>;
    maxNewHardCodedPerPR?: number;
  };
  ignore: string[];
  report: {
    formats: ('json' | 'sarif' | 'html')[];
    outputDir: string;
  };
  baseline?: {
    path: string;
    mode: 'strict' | 'newIssuesOnly';
  };
}

interface Catalogs {
  [locale: string]: Catalog;
}

interface Catalog {
  [key: string]: string | NestedCatalog;
}

interface NestedCatalog {
  [key: string]: string | NestedCatalog;
}

interface TranslationCall {
  keyName: string;
  namespace?: string;
  defaultValue?: string;
  variables?: string[];
  component?: string;
  keyNode?: ASTNode; // Node containing the key string for precise highlighting
}

interface ASTNode {
  type: string;
  start: number;
  end: number;
  loc: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  [key: string]: any;
}

interface Adapter {
  name: string;
  detect: (config: I18nGuardConfig) => boolean;
  loadCatalogs: (config: I18nGuardConfig) => Promise<Catalogs>;
  extractTranslationCalls: (node: ASTNode) => TranslationCall | null;
  generateKey: (text: string, filePath: string, config: I18nGuardConfig) => string;
}

export class LinguiAdapter implements Adapter {
  name = 'lingui';

  detect(config: I18nGuardConfig): boolean {
    return !!config.catalogs.lingui;
  }

  async loadCatalogs(config: I18nGuardConfig): Promise<Catalogs> {
    // Lingui catalog loading implementation
    return {};
  }

  extractTranslationCalls(node: ASTNode): TranslationCall | null {
    // Check for t() calls from Lingui
    if (node.type === 'CallExpression' && node.callee) {
      const callee = node.callee;
      
      if (callee.type === 'Identifier' && callee.name === 't') {
        return this.extractFromTCall(node);
      }
    }

    // Check for <Trans> component from Lingui
    if (node.type === 'JSXElement' && 
        node.openingElement?.name?.name === 'Trans') {
      return this.extractFromTransComponent(node);
    }

    return null;
  }

  generateKey(text: string, filePath: string, config: I18nGuardConfig): string {
    return this.slugify(text).substring(0, config.keygen.maxLen);
  }

  private extractFromTCall(node: ASTNode): TranslationCall | null {
    const args = node.arguments;
    if (!args || args.length === 0) return null;

    // Lingui t() can use template literals or objects
    const messageArg = args[0];
    
    if (messageArg.type === 'StringLiteral' || messageArg.type === 'Literal') {
      return {
        keyName: messageArg.value as string,
        component: 't',
        keyNode: messageArg // Capture the node containing the key string
      };
    }

    return null;
  }

  private extractFromTransComponent(node: ASTNode): TranslationCall | null {
    const attributes = node.openingElement?.attributes || [];
    
    for (const attr of attributes) {
      if (attr.type === 'JSXAttribute' && attr.name?.name === 'id') {
        if (attr.value?.type === 'StringLiteral') {
          return {
            keyName: attr.value.value as string,
            component: 'Trans',
            keyNode: attr.value // Capture the node containing the key string
          };
        }
      }
    }

    return null;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
}
