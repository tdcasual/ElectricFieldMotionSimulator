import test from 'node:test';
import assert from 'node:assert/strict';
import { getObjectRenderer } from '../js/rendering/ObjectRenderers.js';

test('getObjectRenderer returns null for unknown keys', () => {
  assert.equal(getObjectRenderer('unknown'), null);
});
