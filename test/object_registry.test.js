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

test('registry registers all built-in types', async () => {
  const { registry } = await import('../js/core/registerObjects.js');
  const types = [
    'electric-field-rect',
    'electric-field-circle',
    'semicircle-electric-field',
    'parallel-plate-capacitor',
    'vertical-parallel-plate-capacitor',
    'magnetic-field',
    'particle',
    'electron-gun',
    'programmable-emitter',
    'fluorescent-screen',
    'disappear-zone'
  ];
  for (const type of types) {
    assert.ok(registry.get(type), `missing ${type}`);
  }
});
