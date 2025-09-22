const { Scanner } = require('./packages/core/dist/index.js');
const { detectAdapter } = require('./packages/adapters/dist/index.js');
const fs = require('fs');
const path = require('path');

async function testKeyNodeDetection() {
  console.log('🔍 Testing keyNode detection...');
  
  // Load test config
  const configPath = path.join(__dirname, 'test-i18next', 'i18nscan.config.ts');
  const config = {
    library: 'i18next',
    src: ['src/**/*.{ts,tsx}'],
    locales: ['en', 'fr'],
    defaultLocale: 'en',
    catalogs: {
      i18next: {
        pathPattern: path.join(__dirname, 'test-i18next', 'public/locales/{locale}/{ns}.json'),
        namespaces: ['common']
      }
    }
  };
  
  // Load test file
  const testFile = path.join(__dirname, 'test-i18next', 'src', 'App.tsx');
  const content = fs.readFileSync(testFile, 'utf8');
  
  console.log('📄 Test file loaded:', testFile);
  
  // Create scanner
  const adapter = detectAdapter(config);
  const scanner = new Scanner(config, adapter);
  
  console.log('🔧 Adapter detected:', adapter.name);
  
  // Scan the file
  const result = await scanner.scanSingleFile(testFile, content);
  
  console.log('📊 Scan results:');
  console.log('  - Findings:', result.findings.length);
  
  result.findings.forEach((finding, i) => {
    if (i < 5) { // Only show first 5 for debugging
      console.log(`\n${i + 1}. ${finding.message}`);
      console.log(`   Rule: ${finding.ruleId}`);
      console.log(`   Position: line ${finding.line}, col ${finding.column} -> line ${finding.endLine}, col ${finding.endColumn}`);
      console.log(`   Source: "${finding.source}"`);
    }
  });
}

testKeyNodeDetection().catch(console.error);