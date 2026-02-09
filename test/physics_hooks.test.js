import test from 'node:test';
import assert from 'node:assert/strict';
import { registry } from '../js/core/registerObjects.js';

test('physics hook runs on update', () => {
  const entry = registry.get('electron-gun');
  assert.ok(entry.physicsHooks?.onUpdate);
});
