import test from 'node:test';
import assert from 'node:assert/strict';
import { RectElectricField } from '../js/objects/RectElectricField.js';

test('RectElectricField provides defaults and schema', () => {
  assert.equal(RectElectricField.defaults().type, 'electric-field-rect');
  assert.ok(Array.isArray(RectElectricField.schema()));
});

test('RectElectricField serializes unified polygon geometry', () => {
  const field = new RectElectricField({
    x: 10,
    y: 20,
    width: 120,
    height: 60,
    strength: 1000,
    direction: 90
  });

  const serialized = field.serialize();
  assert.equal(serialized.geometry?.kind, 'polygon');
  assert.equal(Array.isArray(serialized.geometry?.vertices), true);
  assert.equal(serialized.geometry.vertices.length, 4);
});

test('RectElectricField can be created from polygon geometry', () => {
  const field = new RectElectricField({
    x: 10,
    y: 20,
    geometry: {
      kind: 'polygon',
      vertices: [
        { x: 0, y: 0 },
        { x: 80, y: 0 },
        { x: 80, y: 40 },
        { x: 0, y: 40 }
      ]
    },
    strength: 1000,
    direction: 90
  });

  assert.equal(field.containsPoint(50, 40), true);
  assert.equal(field.containsPoint(200, 200), false);
  assert.equal(field.serialize().geometry?.kind, 'polygon');
});
