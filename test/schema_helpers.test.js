import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldPosition, fieldSize } from '../js/ui/schemaHelpers.js';

test('schema helpers return field descriptors', () => {
  const pos = fieldPosition();
  assert.equal(pos.key, 'x');
  const size = fieldSize();
  assert.ok(size.length >= 2);
});
