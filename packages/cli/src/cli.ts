#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFile } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { Scanner, mergeConfig } from '@i18nguard/core';
import { I18nextAdapter, FormatJSAdapter, LinguiAdapter } from '@i18nguard/adapters';
import { generateReport } from '@i18nguard/reporter';
import { globby } from 'globby';

// Define interfaces locally to avoid import issues
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
  budgets: {
    coverage: Record<string, number>;
    maxNewHardCodedPerPR?: number;
  };
  ignore: string[];
  keygen: {
    strategy: 'filePathSlug' | 'namespaceSlug' | 'hash';
    maxLen: number;
  };
  report: {
    formats: ('json' | 'sarif' | 'html')[];
    outputDir: string;
  };
  baseline?: {
    path: string;
    mode: 'strict' | 'newIssuesOnly';
  };
}

interface Adapter {
  name: string;
  detect: (config: I18nGuardConfig) => boolean;
  loadCatalogs: (config: I18nGuardConfig) => Promise<any>;
  extractTranslationCalls: (node: any) => any;
  generateKey: (text: string, filePath: string, config: I18nGuardConfig) => string;
}

const program = new Command();

function getVersion(): string {
  try {
    // Read version from package.json colocated with this file (ESM-safe)
    const pkgUrl = new URL('../package.json', import.meta.url);
    const pkgPath = fileURLToPath(pkgUrl);
    const content = readFileSync(pkgPath, 'utf-8');
    return JSON.parse(content).version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

program
  .name('i18nguard')
  .description('Comprehensive i18n linting and validation tool')
  .version(getVersion());

program
  .command('scan')
  .description('Scan source files for i18n issues')
  .option('-c, --config <path>', 'Path to config file (auto-detects if omitted)')
  .option('--format <format>', 'Output format', 'json')
  .option('--output <path>', 'Output file path')
  .option('--fail-on-error', 'Exit with error code if issues found', false)
  .action(async (options) => {
    const spinner = ora('Loading configuration...').start();
    
    try {
      const config = await loadConfig(options.config);
      // Provide helpful hints about configuration before scanning
      await showConfigHints(config);
      spinner.text = 'Scanning files...';
      
      // Detect and initialize adapter
      const adapter = detectAdapter(config);
      if (adapter) {
        spinner.text = 'Loading translation catalogs...';
      }
      
      const scanner = new Scanner(config, adapter || undefined);
      const result = await scanner.scan();
      
      spinner.succeed(`Scan completed: ${result.findings.length} issues found in ${result.summary.totalFiles} files`);
      
      // Print summary
      console.log(chalk.bold('\n📊 Summary:'));
      console.log(`  Hard-coded strings: ${chalk.yellow(result.summary.hardCoded)}`);
      console.log(`  Missing keys: ${chalk.red(result.summary.missing)}`);
      console.log(`  Unused keys: ${chalk.gray(result.summary.unused)}`);
      console.log(`  ICU errors: ${chalk.red(result.summary.icuErrors)}`);
      console.log(`  Files scanned: ${result.summary.totalFiles}`);
      
      // Generate report if requested
      if (options.output) {
        await generateReport(result, options.format, options.output);
        console.log(chalk.green(`\n✅ Report saved to ${options.output}`));
      }
      
      // Exit with error if issues found and fail-on-error is set
      if (options.failOnError && result.findings.length > 0) {
        process.exit(1);
      }
      
    } catch (error) {
      spinner.fail('Scan failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('report')
  .description('Generate a report from scan results')
  .option('-i, --input <path>', 'Input JSON file with scan results')
  .option('-f, --format <format>', 'Report format (json|sarif|html)', 'html')
  .option('-o, --output <path>', 'Output file path')
  .action(async (options) => {
    try {
      if (!options.input) {
        console.error(chalk.red('Input file is required'));
        process.exit(1);
      }
      
      const resultJson = await readFile(options.input, 'utf-8');
      const result = JSON.parse(resultJson);
      
      const outputPath = options.output || `report.${options.format}`;
      await generateReport(result, options.format, outputPath);
      
      console.log(chalk.green(`Report generated: ${outputPath}`));
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('pseudoloc')
  .description('Generate pseudo-localized content for testing')
  .option('-c, --config <path>', 'Path to config file', 'i18nscan.config.ts')
  .option('-l, --locale <locale>', 'Target pseudo-locale', 'pseudo')
  .action(async (options) => {
    console.log(chalk.blue('🌐 Pseudo-localization feature coming soon...'));
  });

program
  .command('watch')
  .description('Watch files for changes and run scan automatically')
  .option('-c, --config <path>', 'Path to config file', 'i18nscan.config.ts')
  .action(async (options) => {
    console.log(chalk.blue('👀 Watch mode feature coming soon...'));
  });

async function loadConfig(configPath?: string): Promise<I18nGuardConfig> {
  try {
    const resolvedPath = await resolveConfigPath(configPath);
    if (!resolvedPath) {
      throw new Error(
        'No config file found. Looked for i18nscan.config.{ts,js,mjs,cjs,json} in current and parent directories.'
      );
    }

    // Support plain JSON configs
    if (resolvedPath.endsWith('.json')) {
      const json = await readFile(resolvedPath, 'utf-8');
      return mergeConfig(JSON.parse(json));
    }

    const configUrl = pathToFileURL(resolvedPath).href;
    const configModule = await import(configUrl);
    const userConfig = configModule.default || configModule;
    return mergeConfig(userConfig);
  } catch (error) {
    throw new Error(`Failed to load config from ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function showConfigHints(config: I18nGuardConfig): Promise<void> {
  // 1) Check that source globs match files
  try {
    const matched = await globby(config.src, { ignore: config.ignore, absolute: true });
    if (!matched || matched.length === 0) {
      console.log(chalk.yellow('\nHint: No source files matched your "src" globs.'));
      console.log(`  src: ${chalk.cyan(JSON.stringify(config.src))}`);
      if (config.ignore?.length) {
        console.log(`  ignore: ${chalk.cyan(JSON.stringify(config.ignore))}`);
      }
      console.log(`  cwd: ${chalk.cyan(process.cwd())}`);
      console.log('  Try adjusting your patterns (e.g., "src/**/*.{ts,tsx,js,jsx}") or run from your project root.');
    }
  } catch {
    // ignore globby errors here
  }

  // 2) i18next catalogs existence check
  if (config.catalogs?.i18next) {
    const pat = config.catalogs.i18next.pathPattern;
    const namespaces = config.catalogs.i18next.namespaces || ['common'];
    const sampleNs = namespaces[0];
    const samplePath = pat
      .replace('{locale}', config.defaultLocale)
      .replace('{ns}', sampleNs);
    const abs = path.isAbsolute(samplePath) ? samplePath : path.join(process.cwd(), samplePath);
    if (!existsSync(abs)) {
      console.log(chalk.yellow('\nHint: i18next catalogs not found at expected locations.'));
      console.log(`  Example expected file: ${chalk.cyan(samplePath)} (not found)`);
      console.log('  Verify your "catalogs.i18next.pathPattern" and that files exist for each locale/namespace.');
      const likelyDirs = [
        path.join(process.cwd(), 'public', 'locales'),
        path.join(process.cwd(), 'src', 'locales'),
        path.join(process.cwd(), 'locales')
      ].filter(existsSync);
      if (likelyDirs.length > 0) {
        console.log('  Detected possible locales directories:');
        for (const d of likelyDirs) console.log(`   - ${chalk.cyan(path.relative(process.cwd(), d))}`);
        console.log('  Adjust pathPattern accordingly (e.g., public/locales/{locale}/{ns}.json).');
      } else {
        console.log('  Create catalogs like:');
        console.log('   - public/locales/en/common.json');
        console.log('   - public/locales/fr/common.json');
        console.log('  Or update pathPattern to match your structure.');
      }
    }
  }

  // 3) FormatJS catalogs existence check
  if (config.catalogs?.formatjs?.messagesGlobs?.length) {
    const patterns = config.catalogs.formatjs.messagesGlobs.map((p: string) =>
      p.replace(/\{locale\}/g, config.defaultLocale)
    );
    try {
      let anyFound = false;
      for (const p of patterns) {
        const files = await globby(p, { absolute: true });
        if (files.length > 0) { anyFound = true; break; }
      }
      if (!anyFound) {
        console.log(chalk.yellow('\nHint: FormatJS message files not found.'));
        console.log(`  Checked patterns (defaultLocale=${config.defaultLocale}):`);
        for (const p of patterns) console.log(`   - ${chalk.cyan(p)}`);
        console.log('  Ensure your files exist or update "catalogs.formatjs.messagesGlobs" (e.g., public/locales/{locale}/messages.json).');
      }
    } catch {
      // ignore globby errors
    }
  }

  // 4) Helpful tip for TypeScript config files when using ESM
  // If the config filename ends with .ts, Node may warn about module type.
  // We can provide a gentle tip without trying to read package.json.
  // (Non-fatal and purely informational.)
  // This hint will show only when the user uses a .ts config.
}
async function resolveConfigPath(configPath?: string): Promise<string | null> {
  if (configPath) {
    const abs = path.isAbsolute(configPath) ? configPath : path.join(process.cwd(), configPath);
    return existsSync(abs) ? abs : null;
  }

  const candidates = [
    'i18nscan.config.ts',
    'i18nscan.config.js',
    'i18nscan.config.mjs',
    'i18nscan.config.cjs',
    'i18nscan.config.json'
  ];

  let dir = process.cwd();
  // Walk up the directory tree to find a config file
  while (true) {
    for (const name of candidates) {
      const full = path.join(dir, name);
      if (existsSync(full)) {
        return full;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function detectAdapter(config: I18nGuardConfig): Adapter | null {
  const adapters = [
    new I18nextAdapter(),
    new FormatJSAdapter(),
    new LinguiAdapter()
  ];

  // Try to auto-detect based on library setting
  if (config.library !== 'auto') {
    for (const adapter of adapters) {
      if (adapter.name === config.library) {
        return adapter;
      }
    }
  }

  // Auto-detect based on configuration
  for (const adapter of adapters) {
    if (adapter.detect(config)) {
      return adapter;
    }
  }

  return null;
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Unhandled promise rejection:'), reason);
  process.exit(1);
});

program.parse();