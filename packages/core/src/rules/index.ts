import type { Rule, ASTNode, RuleContext } from '../types';

export const hardCodedStringRule: Rule = {
  id: 'I18N001',
  name: 'hard-coded-string',
  description: 'Detects hard-coded strings that should be externalized for translation',
  severity: 'warning',
  category: 'hard-coded',
  check: (node: ASTNode, context: RuleContext) => {
    // Skip if this is already a translation call
    if (isTranslationCall(node)) {
      return;
    }

    // Check for JSX text nodes
    if (node.type === 'JSXText') {
      const text = node.value?.trim();
      if (text && shouldBeTranslated(text)) {
        context.report({
          ruleId: 'I18N001',
          severity: 'warning',
          message: `Hard-coded string found: "${text}"`,
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column,
          endLine: node.loc.end.line,
          endColumn: node.loc.end.column,
          source: text,
          suggestion: {
            type: 'externalize',
            description: 'Extract this string to a translation key',
            keyName: generateKeyFromText(text, context.file, context.config)
          }
        });
      }
    }

    // Check for string literals in JSX attributes
    if (node.type === 'JSXAttribute') {
      const attrName = node.name?.name;
      if (isTranslatableAttribute(attrName) && node.value?.type === 'StringLiteral') {
        const text = node.value.value;
        if (shouldBeTranslated(text)) {
          context.report({
            ruleId: 'I18N001',
            severity: 'warning',
            message: `Hard-coded string in ${attrName} attribute: "${text}"`,
            file: context.file,
            line: node.value.loc.start.line,
            column: node.value.loc.start.column,
            endLine: node.value.loc.end.line,
            endColumn: node.value.loc.end.column,
            source: text,
            suggestion: {
              type: 'externalize',
              description: `Extract ${attrName} attribute to a translation key`,
              keyName: generateKeyFromText(text, context.file, context.config)
            }
          });
        }
      }
    }
  }
};

export const missingKeyRule: Rule = {
  id: 'I18N101',
  name: 'missing-key',
  description: 'Detects translation keys that are missing in some locales',
  severity: 'error',
  category: 'missing',
  check: (node: ASTNode, context: RuleContext) => {
    // This rule is typically run during catalog analysis
    // Implementation would check against loaded catalogs
  }
};

export const unusedKeyRule: Rule = {
  id: 'I18N102',
  name: 'unused-key',
  description: 'Detects translation keys that are defined but never used',
  severity: 'warning',
  category: 'unused',
  check: (node: ASTNode, context: RuleContext) => {
    // This rule is typically run during catalog analysis
    // Implementation would check against usage analysis
  }
};

export const icuSyntaxRule: Rule = {
  id: 'I18N201',
  name: 'icu-syntax-error',
  description: 'Detects ICU syntax errors in translation messages',
  severity: 'error',
  category: 'icu',
  check: (node: ASTNode, context: RuleContext) => {
    // This rule would validate ICU syntax using intl-messageformat-parser
  }
};

export const DEFAULT_RULES: Rule[] = [
  hardCodedStringRule,
  missingKeyRule,
  unusedKeyRule,
  icuSyntaxRule
];

// Helper functions
function isTranslationCall(node: ASTNode): boolean {
  // Check if this node is part of a translation function call
  // This would be implemented based on the specific i18n library
  return false; // Placeholder
}

function shouldBeTranslated(text: string): boolean {
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

function isTranslatableAttribute(attrName: string): boolean {
  const translatableAttrs = [
    'title', 'alt', 'placeholder', 'aria-label', 'aria-description',
    'label', 'aria-placeholder', 'aria-valuetext'
  ];
  
  return translatableAttrs.includes(attrName) || attrName.startsWith('data-');
}

function generateKeyFromText(text: string, filePath: string, config: any): string {
  // Simple key generation - would be more sophisticated in real implementation
  const sanitized = text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const fileName = filePath.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || 'unknown';
  
  return `${fileName}.${sanitized}`.substring(0, config.keygen?.maxLen || 60);
}