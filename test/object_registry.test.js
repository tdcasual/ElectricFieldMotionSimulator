import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectRegistry } from '../js/core/ObjectRegistry.js';

test('ObjectRegistry register/get/create/listByCategory', () => {
  const registry = new ObjectRegistry();
  class Dummy {
    static defaults() {
      return { x: 1 };
    }
  }
  registry.register('dummy', {
    class: Dummy,
    label: 'Dummy',
    category: 'test',
    defaults: Dummy.defaults
  });

  assert.equal(registry.get('dummy').label, 'Dummy');
  const inst = registry.create('dummy', { x: 2 });
  assert.equal(inst.constructor, Dummy);
  assert.equal(inst.x, 2);

  const cats = registry.listByCategory();
  assert.equal(cats.test[0].type, 'dummy');
});
