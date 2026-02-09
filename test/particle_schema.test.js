import test from 'node:test';
import assert from 'node:assert/strict';
import { Particle } from '../js/objects/Particle.js';

test('Particle provides defaults and schema', () => {
  const d = Particle.defaults();
  assert.equal(d.type, 'particle');
  const s = Particle.schema();
  assert.ok(Array.isArray(s));
});
