import test from 'node:test';
import assert from 'node:assert/strict';
import { RectElectricField } from '../js/objects/RectElectricField.js';

test('RectElectricField provides defaults and schema', () => {
  assert.equal(RectElectricField.defaults().type, 'electric-field-rect');
  assert.ok(Array.isArray(RectElectricField.schema()));
});
