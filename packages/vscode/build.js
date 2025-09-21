const esbuild = require('esbuild');
const path = require('path');

async function build() {
  try {
    // Clean dist directory first
    const fs = require('fs');
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }
    fs.mkdirSync('dist', { recursive: true });

    await esbuild.build({
      entryPoints: ['src/extension-simple.ts'],
      bundle: true,
      outfile: 'dist/extension.js',
      external: ['vscode'],
      format: 'cjs',
      platform: 'node',
      target: 'node16',
      sourcemap: true,
      minify: false,
      keepNames: true,
      packages: 'bundle', // Bundle all dependencies
      tsconfig: './tsconfig.json',
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      banner: {
        js: '// VS Code Extension - i18nGuard\n'
      },
      loader: {
        '.ts': 'ts'
      },
      resolveExtensions: ['.ts', '.js']
    });
    
    console.log('✓ Extension built successfully');
    
    // Check if the main exports are present
    const builtCode = fs.readFileSync('dist/extension.js', 'utf8');
    if (builtCode.includes('activate') && builtCode.includes('deactivate')) {
      console.log('✓ Main exports (activate, deactivate) found');
    } else {
      console.log('⚠ Warning: Main exports might be missing');
    }
    
  } catch (error) {
    console.error('✗ Build failed:', error);
    process.exit(1);
  }
}

build();