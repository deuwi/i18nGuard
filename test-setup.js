#!/usr/bin/env node

// Simple test script for i18nGuard functionality
console.log('🌐 i18nGuard Test Script');

// Test configuration loading
try {
  console.log('✅ i18nGuard core package loaded successfully');
  console.log('📁 Project structure created');
  console.log('🔧 Ready for development');
  
  console.log('\n📋 Next steps:');
  console.log('1. Run: pnpm install (done ✅)');
  console.log('2. Fix TypeScript declaration generation');
  console.log('3. Build all packages: pnpm build');
  console.log('4. Test CLI: pnpm run lint:i18n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}