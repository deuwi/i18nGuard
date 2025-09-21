import { writeFile } from 'fs/promises';
import { dirname } from 'path';
import { mkdir } from 'fs/promises';

export async function generateReport(
  result: any, // ScanResult from @i18nguard/core 
  format: 'json' | 'sarif' | 'html', 
  outputPath: string
): Promise<void> {
  // Ensure output directory exists
  await mkdir(dirname(outputPath), { recursive: true });

  switch (format) {
    case 'json':
      await generateJsonReport(result, outputPath);
      break;
    case 'sarif':
      await generateSarifReport(result, outputPath);
      break;
    case 'html':
      await generateHtmlReport(result, outputPath);
      break;
    default:
      throw new Error(`Unsupported report format: ${format}`);
  }
}

async function generateJsonReport(result: any, outputPath: string): Promise<void> {
  const report = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    summary: result.summary,
    coverage: result.coverage,
    findings: result.findings
  };

  await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf-8');
}

async function generateSarifReport(result: any, outputPath: string): Promise<void> {
  const sarif = {
    version: '2.1.0',
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: 'i18nGuard',
            version: '1.0.0',
            informationUri: 'https://github.com/i18nguard/i18nguard',
            rules: [
              {
                id: 'I18N001',
                name: 'hard-coded-string',
                shortDescription: { text: 'Hard-coded string detected' },
                fullDescription: { text: 'Detects hard-coded strings that should be externalized for translation' },
                defaultConfiguration: { level: 'warning' }
              },
              {
                id: 'I18N101',
                name: 'missing-key',
                shortDescription: { text: 'Missing translation key' },
                fullDescription: { text: 'Translation key is missing in some locales' },
                defaultConfiguration: { level: 'error' }
              },
              {
                id: 'I18N102',
                name: 'unused-key',
                shortDescription: { text: 'Unused translation key' },
                fullDescription: { text: 'Translation key is defined but never used' },
                defaultConfiguration: { level: 'warning' }
              },
              {
                id: 'I18N201',
                name: 'icu-syntax-error',
                shortDescription: { text: 'ICU syntax error' },
                fullDescription: { text: 'ICU message format syntax error' },
                defaultConfiguration: { level: 'error' }
              }
            ]
          }
        },
        results: result.findings.map((finding: any) => ({
          ruleId: finding.ruleId,
          level: finding.severity === 'error' ? 'error' : 'warning',
          message: { text: finding.message },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: finding.file },
                region: {
                  startLine: finding.line,
                  startColumn: finding.column,
                  endLine: finding.endLine || finding.line,
                  endColumn: finding.endColumn || finding.column
                }
              }
            }
          ],
          fixes: finding.suggestion ? [
            {
              description: { text: finding.suggestion.description },
              artifactChanges: [
                {
                  artifactLocation: { uri: finding.file },
                  replacements: [
                    {
                      deletedRegion: {
                        startLine: finding.line,
                        startColumn: finding.column,
                        endLine: finding.endLine || finding.line,
                        endColumn: finding.endColumn || finding.column
                      },
                      insertedContent: { text: finding.suggestion.replacement || '' }
                    }
                  ]
                }
              ]
            }
          ] : undefined
        }))
      }
    ]
  };

  await writeFile(outputPath, JSON.stringify(sarif, null, 2), 'utf-8');
}

async function generateHtmlReport(result: any, outputPath: string): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>i18nGuard Report</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2563eb; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8fafc; padding: 20px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #1e293b; }
        .metric-label { color: #64748b; margin-top: 5px; }
        .findings { margin-top: 30px; }
        .finding { border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 15px; overflow: hidden; }
        .finding-header { background: #f1f5f9; padding: 15px; border-bottom: 1px solid #e2e8f0; }
        .finding-body { padding: 15px; }
        .severity-error { border-left: 4px solid #dc2626; }
        .severity-warning { border-left: 4px solid #d97706; }
        .severity-info { border-left: 4px solid #2563eb; }
        .file-path { font-family: monospace; color: #64748b; font-size: 0.9em; }
        .location { color: #64748b; font-size: 0.9em; }
        .message { color: #1e293b; margin: 10px 0; }
        .source { background: #f8fafc; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 0.9em; margin-top: 10px; }
        .filter-bar { margin-bottom: 20px; }
        .filter-btn { background: #e2e8f0; border: none; padding: 8px 16px; margin-right: 10px; border-radius: 4px; cursor: pointer; }
        .filter-btn.active { background: #2563eb; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <h1>i18nGuard Report</h1>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${result.summary.hardCoded}</div>
                <div class="metric-label">Hard-coded Strings</div>
            </div>
            <div class="metric">
                <div class="metric-value">${result.summary.missing}</div>
                <div class="metric-label">Missing Keys</div>
            </div>
            <div class="metric">
                <div class="metric-value">${result.summary.unused}</div>
                <div class="metric-label">Unused Keys</div>
            </div>
            <div class="metric">
                <div class="metric-value">${result.summary.icuErrors}</div>
                <div class="metric-label">ICU Errors</div>
            </div>
            <div class="metric">
                <div class="metric-value">${result.summary.totalFiles}</div>
                <div class="metric-label">Files Scanned</div>
            </div>
        </div>

        <div class="findings">
            <h2>Findings (${result.findings.length})</h2>
            
            <div class="filter-bar">
                <button class="filter-btn active" onclick="filterFindings('all')">All</button>
                <button class="filter-btn" onclick="filterFindings('error')">Errors</button>
                <button class="filter-btn" onclick="filterFindings('warning')">Warnings</button>
                <button class="filter-btn" onclick="filterFindings('info')">Info</button>
            </div>
            
            ${result.findings.map((finding: any) => `
                <div class="finding severity-${finding.severity}" data-severity="${finding.severity}">
                    <div class="finding-header">
                        <div class="file-path">${finding.file}</div>
                        <div class="location">Line ${finding.line}, Column ${finding.column}</div>
                    </div>
                    <div class="finding-body">
                        <div class="message">${finding.message}</div>
                        ${finding.source ? `<div class="source">${escapeHtml(finding.source)}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>

    <script>
        function filterFindings(severity) {
            const findings = document.querySelectorAll('.finding');
            const buttons = document.querySelectorAll('.filter-btn');
            
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            findings.forEach(finding => {
                if (severity === 'all' || finding.dataset.severity === severity) {
                    finding.style.display = 'block';
                } else {
                    finding.style.display = 'none';
                }
            });
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    </script>
</body>
</html>
  `.trim();

  await writeFile(outputPath, html, 'utf-8');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}