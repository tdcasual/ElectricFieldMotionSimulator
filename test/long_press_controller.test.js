import test from 'node:test';
import assert from 'node:assert/strict';
import { LongPressController } from '../js/interactions/LongPressController.js';

test('LongPressController defaults preserve the global timer host context', () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;

  let nextTimerId = 100;
  let scheduledThis = null;
  let scheduledCallback = null;
  let clearedThis = null;
  let clearedId = null;
  let callbackFired = 0;

  globalThis.setTimeout = function(callback, delayMs) {
    scheduledThis = this;
    scheduledCallback = callback;
    return nextTimerId++;
  };

  globalThis.clearTimeout = function(timerId) {
    clearedThis = this;
    clearedId = timerId;
  };

  try {
    const controller = new LongPressController();

    controller.start(() => {
      callbackFired += 1;
    }, 550);

    assert.equal(scheduledThis, globalThis);
    assert.equal(typeof scheduledCallback, 'function');
    assert.equal(controller.timerId, 100);

    scheduledCallback();
    assert.equal(callbackFired, 1);
    assert.equal(controller.timerId, null);

    controller.start(() => {}, 550);
    assert.equal(controller.timerId, 101);
    controller.clear();

    assert.equal(clearedThis, globalThis);
    assert.equal(clearedId, 101);
    assert.equal(controller.timerId, null);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});
