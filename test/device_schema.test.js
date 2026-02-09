import test from 'node:test';
import assert from 'node:assert/strict';
import { ElectronGun } from '../js/objects/ElectronGun.js';

test('device objects provide defaults and schema', () => {
  assert.equal(ElectronGun.defaults().type, 'electron-gun');
  assert.ok(Array.isArray(ElectronGun.schema()));
});
