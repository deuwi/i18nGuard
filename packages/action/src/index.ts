import * as core from '@actions/core';
import * as github from '@actions/github';
import { exec } from '@actions/exec';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Scanner, mergeConfig } from '@i18nguard/core';
import { generateReport } from '@i18nguard/reporter';

async function run(): Promise<void> {
  try {
    // Get inputs
    const configPath = core.getInput('config-path') || 'i18nscan.config.ts';
    const failOnError = core.getBooleanInput('fail-on-error');
    const commentPR = core.getBooleanInput('comment-pr');
    const uploadSarif = core.getBooleanInput('upload-sarif');
    const reportFormat = core.getInput('report-format') || 'sarif';
    const baselinePath = core.getInput('baseline-path');
    const workingDirectory = core.getInput('working-directory') || '.';

    core.info(`Starting i18nGuard scan with config: ${configPath}`);

    // Change to working directory
    process.chdir(workingDirectory);

    // Load configuration
    const config = await loadConfig(configPath);
    if (!config) {
      core.setFailed(`Could not load configuration from ${configPath}`);
      return;
    }

    // Run scan
    const scanner = new Scanner(config);
    const result = await scanner.scan();

    // Generate report
    const reportPath = `i18nguard-report.${reportFormat}`;
    await generateReport(result, reportFormat as any, reportPath);

    // Set outputs
    core.setOutput('results-path', reportPath);
    core.setOutput('total-issues', result.findings.length.toString());
    core.setOutput('coverage-percentage', result.coverage.overall.percentage.toString());

    // Compare with baseline if provided
    let newIssues = result.findings.length;
    if (baselinePath && existsSync(baselinePath)) {
      const baseline = JSON.parse(readFileSync(baselinePath, 'utf-8'));
      newIssues = result.findings.length - (baseline.summary?.totalIssues || 0);
      core.setOutput('new-issues', newIssues.toString());
    }

    // Create summary
    const summary = createSummary(result, newIssues !== result.findings.length ? newIssues : undefined);
    core.summary.addHeading('i18nGuard Results').addRaw(summary);
    await core.summary.write();

    // Comment on PR if requested
    if (commentPR && github.context.payload.pull_request) {
      await commentOnPR(result, newIssues !== result.findings.length ? newIssues : undefined);
    }

    // Upload SARIF if requested and format is SARIF
    if (uploadSarif && reportFormat === 'sarif') {
      await uploadSarifResults(reportPath);
    }

    // Fail if requested and issues found
    if (failOnError && result.findings.length > 0) {
      core.setFailed(`Found ${result.findings.length} i18n issues`);
    } else {
      core.info(`Scan completed successfully: ${result.findings.length} issues found`);
    }

  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

async function loadConfig(configPath: string): Promise<any> {
  try {
    if (existsSync(configPath)) {
      // In a real implementation, we would dynamically import the config
      // For now, use a default config
      return {
        library: 'auto',
        src: ['src/**/*.{ts,tsx,js,jsx}'],
        locales: ['en'],
        defaultLocale: 'en',
        catalogs: {},
        budgets: { coverage: {} },
        ignore: ['**/*.test.*', '**/*.spec.*'],
        keygen: { strategy: 'filePathSlug', maxLen: 60 },
        report: { formats: ['sarif'], outputDir: 'reports' }
      };
    }
    return null;
  } catch (error) {
    core.warning(`Failed to load config: ${error}`);
    return null;
  }
}

function createSummary(result: any, newIssues?: number): string {
  let summary = `
## 📊 Summary

| Metric | Count |
|--------|-------|
| Hard-coded strings | ${result.summary.hardCoded} |
| Missing keys | ${result.summary.missing} |
| Unused keys | ${result.summary.unused} |
| ICU errors | ${result.summary.icuErrors} |
| Files scanned | ${result.summary.totalFiles} |
| Total issues | **${result.findings.length}** |
`;

  if (newIssues !== undefined) {
    summary += `| New issues | **${newIssues}** |\n`;
  }

  summary += `\n### Coverage\n`;
  summary += `Overall translation coverage: **${result.coverage.overall.percentage.toFixed(1)}%**\n`;

  if (result.findings.length > 0) {
    summary += `\n### Top Issues\n`;
    const topIssues = result.findings.slice(0, 5);
    for (const issue of topIssues) {
      summary += `- **${issue.file}:${issue.line}** - ${issue.message}\n`;
    }
  }

  return summary;
}

async function commentOnPR(result: any, newIssues?: number) {
  const token = core.getInput('github-token') || process.env.GITHUB_TOKEN;
  if (!token) {
    core.warning('No GitHub token provided, skipping PR comment');
    return;
  }

  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  const pullNumber = github.context.payload.pull_request?.number;

  if (!pullNumber) {
    core.warning('Not a pull request, skipping comment');
    return;
  }

  const summary = createSummary(result, newIssues);
  const comment = `# i18nGuard Report\n\n${summary}`;

  try {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body: comment
    });
    core.info('PR comment created successfully');
  } catch (error) {
    core.warning(`Failed to create PR comment: ${error}`);
  }
}

async function uploadSarifResults(sarifPath: string) {
  try {
    // Use GitHub's upload-sarif action or API
    await exec('gh', ['api', 
      `/repos/${github.context.repo.owner}/${github.context.repo.repo}/code-scanning/sarifs`, 
      '--method', 'POST',
      '--field', `sarif=@${sarifPath}`,
      '--field', `ref=${github.context.ref}`,
      '--field', `commit_sha=${github.context.sha}`
    ]);
    core.info('SARIF results uploaded successfully');
  } catch (error) {
    core.warning(`Failed to upload SARIF results: ${error}`);
  }
}

// Run the action
run();