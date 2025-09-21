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
import * as fs from 'fs';
import * as path from 'path';
import { globby } from 'globby';

export class FormatJSAdapter implements Adapter {
  name = 'formatjs';

  detect(config: I18nGuardConfig): boolean {
    return config.library === 'formatjs' || !!config.catalogs.formatjs;
  }

  async loadCatalogs(config: I18nGuardConfig): Promise<Catalogs> {
    const catalogs: Catalogs = {};
    
    if (!config.catalogs.formatjs?.messagesGlobs) {
      return catalogs;
    }

    for (const locale of config.locales) {
      const catalog: Record<string, string> = {};
      
      // Replace {locale} placeholder in glob patterns
      const patterns = config.catalogs.formatjs.messagesGlobs.map((pattern: string) => 
        pattern.replace(/\{locale\}/g, locale)
      );
      
      // Find all message files for this locale
      for (const pattern of patterns) {
        const files = await globby(pattern, { 
          cwd: process.cwd(),
          absolute: true 
        });
        
        for (const filePath of files) {
          try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const messages = JSON.parse(content);
            
            // Flatten nested messages to dot notation
            this.flattenMessages(messages, catalog);
          } catch (error) {
            console.warn(`Failed to load FormatJS catalog: ${filePath}`, error);
          }
        }
      }
      
      catalogs[locale] = catalog;
    }

    return catalogs;
  }

  private flattenMessages(obj: any, catalog: Record<string, string>, prefix = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'string') {
        catalog[fullKey] = value;
      } else if (typeof value === 'object' && value !== null) {
        this.flattenMessages(value, catalog, fullKey);
      }
    }
  }

  extractTranslationCalls(node: ASTNode): TranslationCall | null {
    // Check for formatMessage() calls from useIntl hook
    if (node.type === 'CallExpression' && node.callee) {
      const callee = node.callee;
      
      // Direct formatMessage call: formatMessage({ id: 'key' })
      if (callee.type === 'Identifier' && callee.name === 'formatMessage') {
        return this.extractFromFormatMessage(node);
      }
      
      // Member expression: intl.formatMessage({ id: 'key' })
      if (callee.type === 'MemberExpression' && 
          callee.property?.name === 'formatMessage') {
        return this.extractFromFormatMessage(node);
      }
    }

    // Check for <FormattedMessage> component
    if (node.type === 'JSXElement' && 
        node.openingElement?.name?.name === 'FormattedMessage') {
      return this.extractFromFormattedMessage(node);
    }

    // Check for self-closing <FormattedMessage />
    if (node.type === 'JSXFragment' || 
        (node.type === 'JSXElement' && node.openingElement?.selfClosing)) {
      if (node.openingElement?.name?.name === 'FormattedMessage') {
        return this.extractFromFormattedMessage(node);
      }
    }

    return null;
  }

  private extractFromFormatMessage(node: ASTNode): TranslationCall | null {
    const args = node.arguments;
    if (!args || args.length === 0) return null;

    const messageArg = args[0];
    if (messageArg.type === 'ObjectExpression') {
      let keyName: string | undefined;
      let defaultValue: string | undefined;
      const variables: string[] = [];

      // Extract properties from the message object
      for (const prop of messageArg.properties || []) {
        if (prop.type === 'Property' && prop.key?.type === 'Identifier') {
          const keyType = prop.key.name;
          
          if (keyType === 'id' && prop.value?.type === 'Literal') {
            keyName = prop.value.value as string;
          } else if (keyType === 'defaultMessage' && prop.value?.type === 'Literal') {
            defaultValue = prop.value.value as string;
          } else if (keyType === 'values' && prop.value?.type === 'ObjectExpression') {
            // Extract variable names from values object
            for (const valueProp of prop.value.properties || []) {
              if (valueProp.type === 'Property' && valueProp.key?.type === 'Identifier') {
                variables.push(valueProp.key.name);
              }
            }
          }
        }
      }
      
      if (keyName) {
        return {
          keyName,
          defaultValue,
          variables: variables.length > 0 ? variables : undefined,
          component: 'formatMessage'
        };
      }
    }

    return null;
  }

  private extractFromFormattedMessage(node: ASTNode): TranslationCall | null {
    const attributes = node.openingElement?.attributes || [];
    
    let keyName: string | undefined;
    let defaultValue: string | undefined;
    const variables: string[] = [];
    
    for (const attr of attributes) {
      if (attr.type === 'JSXAttribute' && attr.name?.name) {
        const attrName = attr.name.name;
        
        if (attrName === 'id') {
          if (attr.value?.type === 'Literal') {
            keyName = attr.value.value as string;
          } else if (attr.value?.type === 'JSXExpressionContainer' && 
                     attr.value.expression?.type === 'Literal') {
            keyName = attr.value.expression.value as string;
          }
        } else if (attrName === 'defaultMessage') {
          if (attr.value?.type === 'Literal') {
            defaultValue = attr.value.value as string;
          } else if (attr.value?.type === 'JSXExpressionContainer' && 
                     attr.value.expression?.type === 'Literal') {
            defaultValue = attr.value.expression.value as string;
          }
        } else if (attrName === 'values') {
          // Extract variable names from values prop
          if (attr.value?.type === 'JSXExpressionContainer' && 
              attr.value.expression?.type === 'ObjectExpression') {
            for (const prop of attr.value.expression.properties || []) {
              if (prop.type === 'Property' && prop.key?.type === 'Identifier') {
                variables.push(prop.key.name);
              }
            }
          }
        }
      }
    }

    if (keyName) {
      return {
        keyName,
        defaultValue,
        variables: variables.length > 0 ? variables : undefined,
        component: 'FormattedMessage'
      };
    }

    return null;
  }

  generateKey(text: string, filePath: string, config: I18nGuardConfig): string {
    const strategy = config.keygen.strategy;
    
    switch (strategy) {
      case 'filePathSlug':
        return this.generateFilePathKey(text, filePath, config.keygen.maxLen);
      case 'namespaceSlug':
        return this.generateNamespaceKey(text, filePath, config.keygen.maxLen);
      case 'hash':
        return this.generateHashKey(text, config.keygen.maxLen);
      default:
        return this.slugify(text).substring(0, config.keygen.maxLen);
    }
  }

  /**
   * Validates ICU message syntax for FormatJS
   */
  validateICUMessage(message: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // Basic ICU syntax validation with proper bracket matching
      const icuPattern = /\{([^}]+)\}/g;
      let match;
      
      while ((match = icuPattern.exec(message)) !== null) {
        const icuExpression = match[1];
        
        // Check for valid ICU syntax patterns
        if (icuExpression.includes(',')) {
          const parts = icuExpression.split(',');
          const variable = parts[0]?.trim();
          const type = parts[1]?.trim();
          
          if (!variable) {
            errors.push(`Missing variable name in ICU expression: {${icuExpression}}`);
            continue;
          }
          
          if (type && !['plural', 'select', 'selectordinal', 'number', 'date', 'time'].includes(type)) {
            errors.push(`Invalid ICU type '${type}' in expression: {${icuExpression}}`);
            continue;
          }
          
          // For plural types, validate the format by looking at the rest of the message
          if (type === 'plural' || type === 'selectordinal') {
            // Find the full plural expression including nested braces
            const fullExpression = this.extractFullPluralExpression(message, match.index);
            this.validatePluralSyntax(fullExpression, errors, icuExpression);
          }
        }
      }
      
      return { valid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`ICU parsing error: ${error}`);
      return { valid: false, errors };
    }
  }

  private extractFullPluralExpression(message: string, startIndex: number): string {
    // Find the opening brace of the ICU expression
    const openBraceIndex = message.indexOf('{', startIndex);
    if (openBraceIndex === -1) return '';
    
    let braceCount = 1;
    let index = openBraceIndex + 1;
    
    // Find the matching closing brace
    while (index < message.length && braceCount > 0) {
      if (message[index] === '{') {
        braceCount++;
      } else if (message[index] === '}') {
        braceCount--;
      }
      index++;
    }
    
    return message.substring(openBraceIndex + 1, index - 1);
  }

  private validatePluralSyntax(fullExpression: string, errors: string[], originalExpression: string): void {
    if (!fullExpression) {
      errors.push(`Could not extract full plural expression for: {${originalExpression}}`);
      return;
    }
    
    // Check for required 'other' case in plurals
    if (!fullExpression.includes('other')) {
      errors.push(`Missing required 'other' case in plural expression: {${originalExpression}}`);
    }
    
    // Check for valid plural keywords
    const pluralKeywords = ['zero', 'one', 'two', 'few', 'many', 'other', '=0', '=1'];
    const foundKeywords = pluralKeywords.filter(keyword => fullExpression.includes(keyword));
    
    if (foundKeywords.length === 0) {
      errors.push(`No valid plural cases found in expression: {${originalExpression}}`);
    }
  }

  private generateFilePathKey(text: string, filePath: string, maxLen: number): string {
    const fileName = path.basename(filePath, path.extname(filePath));
    const slug = this.slugify(text);
    return `${fileName}.${slug}`.substring(0, maxLen);
  }

  private generateNamespaceKey(text: string, filePath: string, maxLen: number): string {
    // Extract namespace from file path (e.g., src/components/Button.tsx -> components.button)
    const relativePath = path.relative(process.cwd(), filePath);
    const pathParts = relativePath.split(path.sep);
    
    // Remove src/ and file extension
    const namespaceParts = pathParts
      .filter(part => part !== 'src')
      .map(part => path.basename(part, path.extname(part)))
      .map(part => this.slugify(part))
      .filter(Boolean);
    
    const namespace = namespaceParts.join('.');
    const slug = this.slugify(text);
    
    return `${namespace}.${slug}`.substring(0, maxLen);
  }

  private generateHashKey(text: string, maxLen: number): string {
    // Simple hash function for consistent key generation
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    const hashString = Math.abs(hash).toString(36);
    return `msg_${hashString}`.substring(0, maxLen);
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');
  }
}
