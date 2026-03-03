import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('pointer lifecycle module exports shared interaction helpers', async () => {
  const mod = await import('../js/interactions/pointerLifecycle.js');
  assert.equal(typeof mod.clearPointerInteractionState, 'function');
  assert.equal(typeof mod.finalizePointerUpInteraction, 'function');
  assert.equal(typeof mod.cancelPointerInteraction, 'function');
});

test('DragDropManager delegates pointer reset/finalize/cancel to lifecycle module', () => {
  const source = read('js/interactions/DragDropManager.js');
  assert.match(source, /from '\.\/pointerLifecycle\.js'/);
  assert.match(source, /clearPointerInteractionState\(\s*this\s*\)/);
  assert.match(source, /finalizePointerUpInteraction\(\s*this,\s*e\s*\)/);
  assert.match(source, /cancelPointerInteraction\(\s*this,\s*e\s*\)/);
});
