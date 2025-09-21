#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFile } from 'fs/promises';
import { pathToFileURL } from 'url';
import { Scanner, mergeConfig } from '@i18nguard/core';
import { I18nextAdapter, FormatJSAdapter, LinguiAdapter } from '@i18nguard/adapters';
import { generateReport } from '@i18nguard/reporter';
import type { I18nGuardConfig, Adapter } from '@i18nguard/core';

const program = new Command();

program
  .name('i18nguard')
  .description('Comprehensive i18n linting and validation tool')
  .version('1.0.0');

program
  .command('scan')
  .description('Scan source files for i18n issues')
  .option('-c, --config <path>', 'Path to config file', 'i18nscan.config.ts')
  .option('--format <format>', 'Output format', 'json')
  .option('--output <path>', 'Output file path')
  .option('--fail-on-error', 'Exit with error code if issues found', false)
  .action(async (options) => {
    const spinner = ora('Loading configuration...').start();
    
    try {
      const config = await loadConfig(options.config);
      spinner.text = 'Scanning files...';
      
      // Detect and initialize adapter
      const adapter = detectAdapter(config);
      if (adapter) {
        spinner.text = 'Loading translation catalogs...';
      }
      
      const scanner = new Scanner(config, adapter || undefined);
      const result = await scanner.scan(config);
      
      spinner.succeed(`Scan completed: ${result.findings.length} issues found in ${result.summary.filesScanned} files`);
      
      // Print summary
      console.log(chalk.bold('\n📊 Summary:'));
      console.log(`  Hard-coded strings: ${chalk.yellow(result.summary.hardCodedStrings)}`);
      console.log(`  Missing keys: ${chalk.red(result.summary.missingKeys)}`);
      console.log(`  Unused keys: ${chalk.gray(result.summary.unusedKeys)}`);
      console.log(`  ICU errors: ${chalk.red(result.summary.icuErrors)}`);
      console.log(`  Files scanned: ${result.summary.filesScanned}`);
      
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

async function loadConfig(configPath: string): Promise<I18nGuardConfig> {
  try {
    const configUrl = pathToFileURL(configPath).href;
    const configModule = await import(configUrl);
    const userConfig = configModule.default || configModule;
    return mergeConfig(userConfig);
  } catch (error) {
    throw new Error(`Failed to load config from ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function detectAdapter(config: I18nGuardConfig): Adapter | null {
  const adapters = [
    I18nextAdapter,
    FormatJSAdapter,
    LinguiAdapter
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