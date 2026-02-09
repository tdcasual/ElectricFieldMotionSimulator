import test from 'node:test';
import assert from 'node:assert/strict';
import { MagneticField } from '../js/objects/MagneticField.js';

test('MagneticField provides defaults and schema', () => {
  assert.equal(MagneticField.defaults().type, 'magnetic-field');
  assert.ok(Array.isArray(MagneticField.schema()));
});
