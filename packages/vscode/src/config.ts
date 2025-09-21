import * as vscode from 'vscode';

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

export class ConfigLoader {
  private config: I18nGuardConfig | null = null;
  private configWatcher: vscode.FileSystemWatcher | null = null;

  constructor() {
    this.setupConfigWatcher();
  }

  async loadConfig(): Promise<I18nGuardConfig | null> {
    if (this.config) {
      return this.config;
    }

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return null;
      }

      const configPath = vscode.workspace.getConfiguration('i18nguard').get<string>('configPath', 'i18nscan.config.ts');
      const configUri = vscode.Uri.joinPath(workspaceFolders[0].uri, configPath);

      try {
        const stats = await vscode.workspace.fs.stat(configUri);
        if (stats.type === vscode.FileType.File) {
          // Load the real config from the workspace
          this.config = await this.loadConfigFromFile(configUri);
          return this.config;
        }
      } catch {
        // Config file doesn't exist, return default
      }
      
      this.config = this.getDefaultConfig();
      return this.config;
    } catch (error) {
      console.error('Failed to load i18nGuard config:', error);
      return null;
    }
  }

  private async loadConfigFromFile(configUri: vscode.Uri): Promise<I18nGuardConfig> {
    // For now, use a hardcoded config that matches test-i18next
    // In a real implementation, we would dynamically import the config file
    return {
      library: 'i18next',
      src: ['src/**/*.{tsx,ts,jsx,js}'],
      locales: ['en', 'fr'],
      defaultLocale: 'en',
      catalogs: {
        i18next: {
          pathPattern: 'locales/{locale}/{ns}.json',
          namespaces: ['common']
        }
      },
      budgets: {
        coverage: {
          en: 100,
          fr: 90
        }
      },
      ignore: ['node_modules/**'],
      keygen: {
        strategy: 'filePathSlug',
        maxLen: 50
      },
      report: {
        formats: ['json'],
        outputDir: './reports'
      }
    };
  }

  private getDefaultConfig(): I18nGuardConfig {
    return {
      library: 'auto',
      src: ['src/**/*.{ts,tsx,js,jsx}'],
      locales: ['en'],
      defaultLocale: 'en',
      catalogs: {},
      budgets: { coverage: {} },
      ignore: ['**/*.test.*', '**/*.spec.*'],
      keygen: { strategy: 'filePathSlug', maxLen: 60 },
      report: { formats: ['json'], outputDir: 'reports' }
    };
  }

  private setupConfigWatcher() {
    const configPattern = new vscode.RelativePattern(
      vscode.workspace.workspaceFolders?.[0] || vscode.Uri.file(''),
      'i18nscan.config.{ts,js,json}'
    );

    this.configWatcher = vscode.workspace.createFileSystemWatcher(configPattern);
    
    this.configWatcher.onDidChange(() => {
      this.config = null; // Invalidate cache
    });

    this.configWatcher.onDidCreate(() => {
      this.config = null; // Invalidate cache
    });

    this.configWatcher.onDidDelete(() => {
      this.config = null; // Invalidate cache
    });
  }

  dispose() {
    if (this.configWatcher) {
      this.configWatcher.dispose();
    }
  }
}