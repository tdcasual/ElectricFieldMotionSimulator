import test from 'node:test';
import assert from 'node:assert/strict';

import { createResetBaselineController } from '../js/utils/ResetBaseline.js';

test('reset baseline restores scene snapshot instead of clearing', () => {
  const controller = createResetBaselineController();
  const initial = {
    settings: { mode: 'demo', gravity: 0 },
    objects: [{ type: 'particle', x: 10, y: 20 }]
  };

  controller.setBaseline(initial);

  const restored = controller.restoreBaseline();
  assert.deepEqual(restored, initial);
  assert.equal(controller.hasBaseline(), true);
});

test('reset baseline snapshot is immutable from caller mutations', () => {
  const controller = createResetBaselineController();
  const snapshot = {
    settings: { mode: 'demo' },
    objects: [{ type: 'particle', x: 1, y: 2 }]
  };
  controller.setBaseline(snapshot);

  snapshot.objects[0].x = 999;
  const restored = controller.restoreBaseline();
  assert.equal(restored.objects[0].x, 1);

  restored.objects[0].x = 777;
  const restoredAgain = controller.restoreBaseline();
  assert.equal(restoredAgain.objects[0].x, 1);
});

test('setBaseline ignores invalid input', () => {
  const controller = createResetBaselineController();
  assert.equal(controller.setBaseline(null), false);
  assert.equal(controller.hasBaseline(), false);
});
