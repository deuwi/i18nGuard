// @ts-nocheck
import * as path from 'path';
import * as fs from 'fs';
import Mocha from 'mocha';

function collectTestFiles(dir: string, collected: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      collectTestFiles(fullPath, collected);
    } else if (entry.isFile() && /\.test\.js$/.test(entry.name)) {
      collected.push(fullPath);
    }
  }
  return collected;
}

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'bdd', color: true, timeout: 10000 });
  const testsRoot = path.resolve(__dirname);

  return new Promise((resolve, reject) => {
    try {
      const files = collectTestFiles(testsRoot);
      files.forEach((f) => mocha.addFile(f));

      mocha.run((failures) => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed`));
        } else {
          resolve();
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}
