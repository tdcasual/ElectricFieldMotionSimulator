import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveToolEntry, getCreationOverrides } from '../js/interactions/DragDropManager.js';

test('resolveToolEntry maps toolbar aliases', () => {
  const cap = resolveToolEntry('capacitor');
  assert.equal(cap.type, 'parallel-plate-capacitor');

  const semicircle = resolveToolEntry('electric-field-semicircle');
  assert.equal(semicircle.type, 'semicircle-electric-field');

  const magneticLong = resolveToolEntry('magnetic-field-long');
  assert.equal(magneticLong.type, 'magnetic-field-long');
});

test('getCreationOverrides applies pixels-per-meter scaling', () => {
  const overrides = getCreationOverrides('particle', 2);
  assert.equal(overrides.vx, 100);
});

test('getCreationOverrides returns empty overrides in demo mode', () => {
  const overrides = getCreationOverrides('particle', 2, { demoMode: true });
  assert.deepEqual(overrides, {});
});
