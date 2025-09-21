import { parse as babelParse } from '@babel/parser';
import { parse as typescriptParse } from '@typescript-eslint/typescript-estree';
import type { ASTNode } from '../types';

export interface ParseOptions {
  filePath: string;
  source: string;
  parser?: 'babel' | 'typescript' | 'auto';
}

export function parseCode({ filePath, source, parser = 'auto' }: ParseOptions): ASTNode {
  const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  const useParser = parser === 'auto' ? (isTypeScript ? 'typescript' : 'babel') : parser;

  if (useParser === 'typescript') {
    const ast = typescriptParse(source, {
      filePath,
      loc: true,
      range: true,
      jsx: filePath.endsWith('.tsx') || filePath.endsWith('.jsx'),
      allowInvalidAST: false,
      errorOnUnknownASTType: false,
      errorOnTypeScriptSyntacticAndSemanticIssues: false
    });
    
    // Convert to our ASTNode type (add missing properties)
    return {
      ...ast,
      start: ast.range?.[0] ?? 0,
      end: ast.range?.[1] ?? 0
    } as ASTNode;
  }

  // Use Babel parser for JavaScript/JSX
  const plugins: any[] = ['decorators-legacy'];
  
  if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
    plugins.push('jsx');
  }
  
  if (isTypeScript) {
    plugins.push('typescript');
  }

  const ast = babelParse(source, {
    sourceType: 'module',
    allowImportExportEverywhere: true,
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true,
    plugins
  });

  // Convert to our ASTNode type
  return {
    ...ast,
    start: ast.start ?? 0,
    end: ast.end ?? 0
  } as ASTNode;
}

export function isReactComponent(node: ASTNode): boolean {
  // Check if this is a JSX element
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
    return true;
  }
  
  // Check if this is a function component
  if (node.type === 'FunctionDeclaration' || node.type === 'ArrowFunctionExpression') {
    // Simple heuristic: function that returns JSX
    return containsJSX(node);
  }
  
  return false;
}

export function containsJSX(node: ASTNode): boolean {
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
    return true;
  }
  
  // Recursively check children
  for (const key in node) {
    const value = node[key];
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && containsJSX(item)) {
            return true;
          }
        }
      } else if (containsJSX(value)) {
        return true;
      }
    }
  }
  
  return false;
}

export function extractStringLiterals(node: ASTNode): Array<{ value: string; node: ASTNode }> {
  const literals: Array<{ value: string; node: ASTNode }> = [];
  
  function traverse(currentNode: ASTNode) {
    if (currentNode.type === 'StringLiteral' || currentNode.type === 'Literal') {
      if (typeof currentNode.value === 'string') {
        literals.push({ value: currentNode.value, node: currentNode });
      }
    }
    
    if (currentNode.type === 'TemplateLiteral') {
      // Handle template literals - extract static parts
      if (currentNode.quasis) {
        for (const quasi of currentNode.quasis) {
          if (quasi.value?.raw) {
            literals.push({ value: quasi.value.raw, node: quasi });
          }
        }
      }
    }
    
    // Recursively traverse child nodes
    for (const key in currentNode) {
      const value = currentNode[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object') {
              traverse(item);
            }
          }
        } else {
          traverse(value);
        }
      }
    }
  }
  
  traverse(node);
  return literals;
}