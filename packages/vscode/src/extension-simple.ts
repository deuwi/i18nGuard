import * as vscode from 'vscode';

// Simplified i18nGuard extension for testing
export function activate(context: vscode.ExtensionContext) {
  console.log('i18nGuard extension is now active');
  vscode.window.showInformationMessage('i18nGuard extension activated successfully!');

  // Create diagnostic collection
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('i18nguard');
  context.subscriptions.push(diagnosticCollection);

  // Register scan command
  const scanCommand = vscode.commands.registerCommand('i18nguard.scan', () => {
    vscode.window.showInformationMessage('i18nGuard scan command executed!');
    scanActiveDocument(diagnosticCollection);
  });
  context.subscriptions.push(scanCommand);

  // Register document change handlers for auto-scanning
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (isSupported(event.document)) {
        scanDocument(event.document, diagnosticCollection);
      }
    }),
    
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (isSupported(document)) {
        scanDocument(document, diagnosticCollection);
      }
    })
  );

  // Initial scan of open documents
  vscode.workspace.textDocuments.forEach(document => {
    if (isSupported(document)) {
      scanDocument(document, diagnosticCollection);
    }
  });

  vscode.window.showInformationMessage('i18nGuard initialization complete');
}

export function deactivate() {
  console.log('i18nGuard extension is being deactivated');
}

function isSupported(document: vscode.TextDocument): boolean {
  const supportedLanguages = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'];
  return supportedLanguages.includes(document.languageId);
}

function scanActiveDocument(diagnosticCollection: vscode.DiagnosticCollection) {
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && isSupported(activeEditor.document)) {
    scanDocument(activeEditor.document, diagnosticCollection);
  } else {
    vscode.window.showWarningMessage('No supported document is currently active');
  }
}

function scanDocument(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection) {
  const diagnostics: vscode.Diagnostic[] = [];
  const text = document.getText();
  const lines = text.split('\n');

  // Simple hard-coded string detection
  lines.forEach((line, lineNumber) => {
    // Look for hard-coded strings in JSX/TSX
    const hardCodedPatterns = [
      /['"]([^'"]*(?:hard-coded|This is|New|Home|Missing)[^'"]*)['"](?!\s*:)/g,
      />\s*([A-Z][^<{]*[a-z][^<{]*)</g // Text between JSX tags
    ];

    hardCodedPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const startPos = new vscode.Position(lineNumber, match.index);
        const endPos = new vscode.Position(lineNumber, match.index + match[0].length);
        const range = new vscode.Range(startPos, endPos);
        
        const diagnostic = new vscode.Diagnostic(
          range,
          `Hard-coded string detected: "${match[1] || match[0]}". Consider using i18n.`,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.source = 'i18nguard';
        diagnostic.code = 'hard-coded-string';
        diagnostics.push(diagnostic);
      }
    });

    // Look for missing translation keys
    const missingKeyPattern = /t\(['"]([^'"]*missing[^'"]*)['"\)]/gi;
    let match;
    while ((match = missingKeyPattern.exec(line)) !== null) {
      const startPos = new vscode.Position(lineNumber, match.index);
      const endPos = new vscode.Position(lineNumber, match.index + match[0].length);
      const range = new vscode.Range(startPos, endPos);
      
      const diagnostic = new vscode.Diagnostic(
        range,
        `Translation key not found: "${match[1]}"`,
        vscode.DiagnosticSeverity.Error
      );
      diagnostic.source = 'i18nguard';
      diagnostic.code = 'missing-translation-key';
      diagnostics.push(diagnostic);
    }
  });

  diagnosticCollection.set(document.uri, diagnostics);
  
  if (diagnostics.length > 0) {
    console.log(`Found ${diagnostics.length} i18n issues in ${document.fileName}`);
  }
}