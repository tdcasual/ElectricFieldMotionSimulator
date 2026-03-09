import test from 'node:test';
import assert from 'node:assert/strict';
import { ContextMenuController } from '../js/interactions/ContextMenuController.js';

test('ContextMenuController shows and hides menu with deferred outside click binding', async () => {
  const menu = { style: { display: 'none', left: '', top: '' } };
  const listeners = new Map();
  const documentStub = {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    getElementById(id) {
      return id === 'context-menu' ? menu : null;
    }
  };

  const controller = new ContextMenuController({
    documentRef: documentStub,
    setTimeoutRef: (fn) => {
      fn();
      return 1;
    },
    clearTimeoutRef() {}
  });

  controller.show({ clientX: 12, clientY: 34 });
  assert.equal(menu.style.display, 'block');
  assert.equal(menu.style.left, '12px');
  assert.equal(menu.style.top, '34px');
  assert.equal(typeof listeners.get('click'), 'function');

  listeners.get('click')();
  assert.equal(menu.style.display, 'none');
});
