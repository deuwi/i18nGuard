import * as vscode from 'vscode';
import { DiagnosticProvider } from './diagnostics';
import { CodeActionProvider } from './codeActions';
import { ConfigLoader } from './config';

let diagnosticCollection: vscode.DiagnosticCollection;
let diagnosticProvider: DiagnosticProvider;
let codeActionProvider: CodeActionProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log('i18nGuard extension is now active');
  vscode.window.showInformationMessage('i18nGuard extension activated!');

  // Create diagnostic collection
  diagnosticCollection = vscode.languages.createDiagnosticCollection('i18nguard');
  context.subscriptions.push(diagnosticCollection);

  // Initialize providers
  const configLoader = new ConfigLoader();
  diagnosticProvider = new DiagnosticProvider(diagnosticCollection, configLoader);
  codeActionProvider = new CodeActionProvider(configLoader);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('i18nguard.scan', () => {
      vscode.window.showInformationMessage('i18nGuard scan triggered manually');
      diagnosticProvider.scanWorkspace();
    }),
    
    vscode.commands.registerCommand('i18nguard.externalizeString', (uri: vscode.Uri, range: vscode.Range) => {
      codeActionProvider.externalizeString(uri, range);
    }),
    
    vscode.commands.registerCommand('i18nguard.generateReport', () => {
      generateReport();
    })
  );

  // Register code action provider
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      [
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'typescriptreact' },
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'javascriptreact' }
      ],
      codeActionProvider,
      {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
      }
    )
  );

  // Register document change handlers
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (isSupported(event.document)) {
        diagnosticProvider.scanDocument(event.document);
      }
    }),
    
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (isSupported(document)) {
        diagnosticProvider.scanDocument(document);
      }
    }),
    
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (isSupported(document)) {
        diagnosticProvider.scanDocument(document);
      }
    })
  );

  // Initial scan of open documents
  vscode.workspace.textDocuments.forEach(document => {
    if (isSupported(document)) {
      console.log(`Scanning document: ${document.fileName}`);
      diagnosticProvider.scanDocument(document);
    }
  });

  vscode.window.showInformationMessage('i18nGuard initialization complete');
}

export function deactivate() {
  if (diagnosticCollection) {
    diagnosticCollection.dispose();
  }
}

function isSupported(document: vscode.TextDocument): boolean {
  const supportedLanguages = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'];
  return supportedLanguages.includes(document.languageId);
}

async function generateReport() {
  const options: vscode.SaveDialogOptions = {
    defaultUri: vscode.Uri.file('i18n-report.html'),
    filters: {
      'HTML': ['html'],
      'JSON': ['json'],
      'SARIF': ['sarif']
    }
  };

  const uri = await vscode.window.showSaveDialog(options);
  if (uri) {
    try {
      await diagnosticProvider.generateReport(uri);
      vscode.window.showInformationMessage(`Report generated: ${uri.fsPath}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to generate report: ${error}`);
    }
  }
}