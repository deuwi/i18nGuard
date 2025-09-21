// @ts-nocheck
import * as assert from 'assert';
import * as vscode from 'vscode';

describe('i18nGuard Extension', () => {
  it('activates successfully', async () => {
    const extension = vscode.extensions.getExtension('i18nguard.i18nguard');
    assert.ok(extension, 'Extension should be found');
    await extension!.activate();
    assert.strictEqual(extension!.isActive, true, 'Extension should be active after activation');
  });
});
