import * as vscode from 'vscode';
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

export class ConfigLoader {
  // Cache configs per config file path to support multiple projects in a monorepo
  private configCache: Map<string, I18nGuardConfig> = new Map();
  private configWatcher: vscode.FileSystemWatcher | null = null;
  private lastConfigDir: vscode.Uri | null = null;

  constructor() {
    this.setupConfigWatcher();
  }

  async loadConfig(contextUri?: vscode.Uri): Promise<I18nGuardConfig | null> {

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return null;
      }

      const configFileName = vscode.workspace.getConfiguration('i18nguard').get<string>('configPath', 'i18nscan.config.ts');
  let configUri: vscode.Uri | null = null;

      // Try to find nearest config starting from the document directory, if provided
      if (contextUri) {
        configUri = await this.findNearestConfig(contextUri, configFileName);
      }

      // Fallback: workspace root config file
      if (!configUri) {
        const rootCandidate = vscode.Uri.joinPath(workspaceFolders[0].uri, configFileName);
        try {
          const stats = await vscode.workspace.fs.stat(rootCandidate);
          if (stats.type === vscode.FileType.File) {
            configUri = rootCandidate;
          }
        } catch {
          // ignore
        }
      }

      if (configUri) {
        const configPath = configUri.toString();
          // Use fsPath to compute directory to be robust on Windows casing and separators
          this.lastConfigDir = vscode.Uri.file(path.dirname(configUri.fsPath));
        if (this.configCache.has(configPath)) {
          return this.configCache.get(configPath)!;
        }
        const loaded = await this.loadConfigFromFile(configUri);
        this.configCache.set(configPath, loaded);
        return loaded;
      }

      // Fallback when no config is found
      this.lastConfigDir = workspaceFolders[0].uri;
      const def = this.getDefaultConfig();
      this.configCache.set('default', def);
      return def;
    } catch (error) {
      console.error('Failed to load i18nGuard config:', error);
      return null;
    }
  }

  private async loadConfigFromFile(configUri: vscode.Uri): Promise<I18nGuardConfig> {
    // Read the config file and extract minimal fields via regex (no TS execution)
    let text = '';
    try {
      const buf = await vscode.workspace.fs.readFile(configUri);
      text = Buffer.from(buf).toString('utf8');
    } catch {
      // fallback
    }

    const rx = {
      library: /library\s*:\s*['\"](i18next|formatjs|lingui|auto)['\"]/,
      defaultLocale: /defaultLocale\s*:\s*['\"]([^'"\n]+)['\"]/,
      // locales: ['en', 'fr', "es"] (allow newlines)
      locales: /locales\s*:\s*\[([\s\S]*?)\]/m,
      // Match i18next block then pathPattern within, across newlines
      pathPattern: /i18next\s*:\s*\{[\s\S]*?pathPattern\s*:\s*['\"]([^'"\n]+)['\"]/,
    };

    const library = rx.library.exec(text)?.[1] as I18nGuardConfig['library'] | undefined;
    const defaultLocale = rx.defaultLocale.exec(text)?.[1] || 'en';
    const pathPattern = rx.pathPattern.exec(text)?.[1] || 'locales/{locale}/{ns}.json';
    // Extract locales list if present
    let locales: string[] = ['en'];
    const localesMatch = rx.locales.exec(text);
    if (localesMatch && localesMatch[1]) {
      const body = localesMatch[1];
      const stringRx = /['\"]([^'\"]+)['\"]/g;
      const arr: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = stringRx.exec(body))) {
        arr.push(m[1]);
      }
      if (arr.length > 0) locales = arr;
    }

    return {
      library: library || 'auto',
      src: ['src/**/*.{ts,tsx,js,jsx}'],
  locales,
      defaultLocale,
      catalogs: {
        i18next: {
          pathPattern,
          namespaces: ['common']
        }
      },
      budgets: { coverage: {} },
      ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**'],
      keygen: { strategy: 'filePathSlug', maxLen: 60 },
      report: { formats: ['json'], outputDir: 'reports' }
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

  private async findNearestConfig(contextUri: vscode.Uri, fileName: string): Promise<vscode.Uri | null> {
    try {
      const folder = vscode.workspace.getWorkspaceFolder(contextUri) || vscode.workspace.workspaceFolders?.[0];
      if (!folder) return null;

      // Use fsPath and case-insensitive comparison for Windows robustness
      const rootFsPath = folder.uri.fsPath.replace(/[\\/]+$/, '');
      let dirFsPath = ((): string => {
        const full = contextUri.fsPath;
        const sep = /[\\/]/;
        const idx = full.lastIndexOf(path.sep);
        if (idx > 0) return full.substring(0, idx);
        // Fallback: try slash if path.sep not found
        const idx2 = full.lastIndexOf('/');
        return idx2 > 0 ? full.substring(0, idx2) : full;
      })();

      let guard = 0;
      while (
        dirFsPath.toLowerCase().startsWith(rootFsPath.toLowerCase()) &&
        guard++ < 100
      ) {
        const candidateFsPath = path.join(dirFsPath, fileName);
        const candidate = vscode.Uri.file(candidateFsPath);
        try {
          const st = await vscode.workspace.fs.stat(candidate);
          if (st.type === vscode.FileType.File) {
            return candidate;
          }
        } catch {
          // not here
        }
          const parent = path.dirname(dirFsPath);
          if (parent === dirFsPath) break;
          dirFsPath = parent;
      }
      return null;
    } catch {
      return null;
    }
  }

  getLastConfigDir(): vscode.Uri | null {
    return this.lastConfigDir;
  }

  private setupConfigWatcher() {
    // Watch for config files anywhere in the workspace(s)
    const patterns: vscode.GlobPattern[] = (vscode.workspace.workspaceFolders || []).map(folder =>
      new vscode.RelativePattern(folder, '**/i18nscan.config.{ts,js,json}')
    );

    // If no workspace, fall back to root
    const pattern = patterns[0] ?? new vscode.RelativePattern(vscode.Uri.file(''), '**/i18nscan.config.{ts,js,json}');
    this.configWatcher = vscode.workspace.createFileSystemWatcher(pattern);
    
    this.configWatcher.onDidChange(async (uri) => {
      // Invalidate the specific cache entry and lastConfigDir if it matches
      this.configCache.delete(uri.toString());
      this.lastConfigDir = null;
    });

    this.configWatcher.onDidCreate(async (uri) => {
      this.configCache.delete(uri.toString());
      this.lastConfigDir = null;
    });

    this.configWatcher.onDidDelete(async (uri) => {
      this.configCache.delete(uri.toString());
      this.lastConfigDir = null;
    });
  }

  dispose() {
    if (this.configWatcher) {
      this.configWatcher.dispose();
    }
  }
}