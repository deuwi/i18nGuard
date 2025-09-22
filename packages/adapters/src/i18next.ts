import { readFile } from 'fs/promises';
import { globby } from 'globby';
import * as path from 'path';

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

export class I18nextAdapter implements Adapter {
  name = 'i18next';

  detect(config: I18nGuardConfig): boolean {
    // Check if i18next config is present
    return !!config.catalogs.i18next;
  }

  async loadCatalogs(config: I18nGuardConfig): Promise<Catalogs> {
    const i18nextConfig = config.catalogs.i18next;
    if (!i18nextConfig) {
      throw new Error('i18next configuration is missing');
    }

    const catalogs: Catalogs = {};
    
    for (const locale of config.locales) {
      catalogs[locale] = {};
      
      // Build the namespace list: configured + discovered on disk
      const nsSet = new Set<string>(i18nextConfig.namespaces || []);
      try {
        const basePattern = i18nextConfig.pathPattern.replace('{locale}', locale);
        const globPattern = basePattern.replace('{ns}', '*').replace(/\\/g, '/');
        const files = await globby(globPattern, { absolute: true });
        for (const file of files) {
          const nsName = path.basename(file).replace(/\.[^.]+$/, '');
          if (nsName) nsSet.add(nsName);
        }
      } catch (e) {
        // ignore discovery errors; we'll fallback to configured namespaces
      }

      for (const namespace of nsSet) {
        const catalogPath = i18nextConfig.pathPattern
          .replace('{locale}', locale)
          .replace('{ns}', String(namespace));
          
        try {
          const content = await readFile(catalogPath, 'utf-8');
          const catalogData = JSON.parse(content);
          
          // Merge namespace into locale catalog
          catalogs[locale] = {
            ...catalogs[locale],
            ...this.flattenCatalog(catalogData, namespace)
          };
        } catch (error) {
          console.warn(`Failed to load catalog ${catalogPath}:`, error);
        }
      }
    }

    return catalogs;
  }

  extractTranslationCalls(node: ASTNode): TranslationCall | null {
    // Check for t() function calls
    if (node.type === 'CallExpression' && node.callee) {
      const callee = node.callee;
      
      // Direct t() call
      if (callee.type === 'Identifier' && callee.name === 't') {
        return this.extractFromTCall(node);
      }
      
      // i18n.t() or i18next.t() call
      if (callee.type === 'MemberExpression' && 
          callee.property?.name === 't' &&
          callee.object?.name && ['i18n', 'i18next'].includes(callee.object.name)) {
        return this.extractFromTCall(node);
      }
    }

    // Check for <Trans> component
    if (node.type === 'JSXElement' && node.openingElement?.name?.name === 'Trans') {
      return this.extractFromTransComponent(node);
    }

    return null;
  }

  generateKey(text: string, filePath: string, config: I18nGuardConfig): string {
    const strategy = config.keygen.strategy;
    const maxLen = config.keygen.maxLen;

    switch (strategy) {
      case 'filePathSlug':
        return this.generateFilePathKey(text, filePath, maxLen);
      case 'namespaceSlug':
        return this.generateNamespaceKey(text, filePath, maxLen);
      case 'hash':
        return this.generateHashKey(text, filePath, maxLen);
      default:
        return this.generateFilePathKey(text, filePath, maxLen);
    }
  }

  private flattenCatalog(catalog: any, namespace: string, prefix = ''): Record<string, string> {
    const flattened: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(catalog)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const namespacedKey = `${namespace}:${fullKey}`;
      
      if (typeof value === 'string') {
        flattened[namespacedKey] = value;
      } else if (typeof value === 'object' && value !== null) {
        Object.assign(flattened, this.flattenCatalog(value, namespace, fullKey));
      }
    }
    
    return flattened;
  }

  private extractFromTCall(node: ASTNode): TranslationCall | null {
    const args = node.arguments;
    if (!args || args.length === 0) return null;

    const keyArg = args[0];
    if (keyArg.type !== 'StringLiteral' && keyArg.type !== 'Literal') return null;

    const keyName = keyArg.value as string;
    const defaultValue = args[1]?.type === 'StringLiteral' ? args[1].value as string : undefined;

    // Extract namespace from key if present (e.g., "common:hello" -> namespace: "common", key: "hello")
    const [namespace, ...keyParts] = keyName.split(':');
    const actualKey = keyParts.length > 0 ? keyParts.join(':') : namespace;
    const actualNamespace = keyParts.length > 0 ? namespace : undefined;

    return {
      keyName: actualKey,
      namespace: actualNamespace,
      defaultValue,
      component: 't',
      keyNode: keyArg
    };
  }

  private extractFromTransComponent(node: ASTNode): TranslationCall | null {
    const attributes = node.openingElement?.attributes || [];
    
    for (const attr of attributes) {
      if (attr.type === 'JSXAttribute' && attr.name?.name === 'i18nKey') {
        if (attr.value?.type === 'StringLiteral') {
          const keyName = attr.value.value as string;
          
          // Extract namespace from key if present (e.g., "common:hello" -> namespace: "common", key: "hello")
          const [namespace, ...keyParts] = keyName.split(':');
          const actualKey = keyParts.length > 0 ? keyParts.join(':') : namespace;
          const actualNamespace = keyParts.length > 0 ? namespace : undefined;
          
          return {
            keyName: actualKey,
            namespace: actualNamespace,
            component: 'Trans',
            keyNode: attr.value // Capture the node containing the key string
          };
        }
      }
    }

    return null;
  }

  private generateFilePathKey(text: string, filePath: string, maxLen: number): string {
    const fileName = filePath.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || 'unknown';
    const textSlug = this.slugify(text);
    return `${fileName}.${textSlug}`.substring(0, maxLen);
  }

  private generateNamespaceKey(text: string, filePath: string, maxLen: number): string {
    // Determine namespace from file path (could be more sophisticated)
    const namespace = filePath.includes('/components/') ? 'common' : 'app';
    const textSlug = this.slugify(text);
    return `${namespace}.${textSlug}`.substring(0, maxLen);
  }

  private generateHashKey(text: string, filePath: string, maxLen: number): string {
    const hash = this.simpleHash(text + filePath);
    return `key_${hash}`.substring(0, maxLen);
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}
