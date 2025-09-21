export { I18nextAdapter } from './i18next';
export { FormatJSAdapter } from './formatjs';
export { LinguiAdapter } from './lingui';

import { I18nextAdapter } from './i18next';
import { FormatJSAdapter } from './formatjs';
import { LinguiAdapter } from './lingui';

export const adapters: any[] = [
  new I18nextAdapter(),
  new FormatJSAdapter(),
  new LinguiAdapter()
];

export function detectAdapter(config: any): any {
  if (config.library !== 'auto') {
    const adapter = adapters.find(a => a.name === config.library);
    if (!adapter) {
      throw new Error(`Unknown library: ${config.library}`);
    }
    return adapter;
  }

  // Auto-detect based on config and project files
  for (const adapter of adapters) {
    if (adapter.detect(config)) {
      return adapter;
    }
  }

  throw new Error('Could not auto-detect i18n library. Please specify library in config.');
}
