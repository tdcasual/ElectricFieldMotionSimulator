import test from 'node:test';
import assert from 'node:assert/strict';
import { RectElectricField } from '../js/objects/RectElectricField.js';
import { CircleElectricField } from '../js/objects/CircleElectricField.js';
import { SemiCircleElectricField } from '../js/objects/SemiCircleElectricField.js';

test('RectElectricField provides defaults and schema', () => {
  assert.equal(RectElectricField.defaults().type, 'electric-field-rect');
  assert.ok(Array.isArray(RectElectricField.schema()));
});

test('RectElectricField serializes unified polygon geometry', () => {
  const field = new RectElectricField({
    x: 10,
    y: 20,
    geometry: {
      kind: 'polygon',
      vertices: [
        { x: 0, y: 0 },
        { x: 120, y: 0 },
        { x: 120, y: 60 },
        { x: 0, y: 60 }
      ]
    },
    strength: 1000,
    direction: 90
  });

  const serialized = field.serialize();
  assert.equal(serialized.geometry?.kind, 'polygon');
  assert.equal(Array.isArray(serialized.geometry?.vertices), true);
  assert.equal(serialized.geometry.vertices.length, 4);
  assert.equal(Object.prototype.hasOwnProperty.call(serialized, 'vertices'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(serialized, 'width'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(serialized, 'height'), false);
});

test('RectElectricField ignores legacy width/height input when geometry is missing', () => {
  const field = new RectElectricField({
    x: 10,
    y: 20,
    width: 12,
    height: 8,
    strength: 1000,
    direction: 90
  });

  const serialized = field.serialize();
  assert.equal(serialized.geometry?.kind, 'polygon');
  assert.equal(serialized.geometry?.vertices?.[1]?.x, 200);
  assert.equal(serialized.geometry?.vertices?.[2]?.y, 150);
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

test('CircleElectricField serializes geometry only', () => {
  const field = new CircleElectricField({
    x: 10,
    y: 20,
    geometry: {
      kind: 'circle',
      radius: 80
    },
    strength: 1000,
    direction: 90
  });

  const serialized = field.serialize();
  assert.equal(serialized.geometry?.kind, 'circle');
  assert.equal(serialized.geometry?.radius, 80);
  assert.equal(Object.prototype.hasOwnProperty.call(serialized, 'radius'), false);
});

test('CircleElectricField ignores legacy radius input when geometry is missing', () => {
  const field = new CircleElectricField({
    x: 10,
    y: 20,
    radius: 80,
    strength: 1000,
    direction: 90
  });

  const serialized = field.serialize();
  assert.equal(serialized.geometry?.radius, 100);
});

test('SemiCircleElectricField serializes geometry only', () => {
  const field = new SemiCircleElectricField({
    x: 10,
    y: 20,
    geometry: {
      kind: 'circle',
      radius: 80
    },
    strength: 1000,
    direction: 90,
    orientation: 45
  });

  const serialized = field.serialize();
  assert.equal(serialized.geometry?.kind, 'circle');
  assert.equal(serialized.geometry?.radius, 80);
  assert.equal(Object.prototype.hasOwnProperty.call(serialized, 'radius'), false);
});

test('SemiCircleElectricField ignores legacy radius input when geometry is missing', () => {
  const field = new SemiCircleElectricField({
    x: 10,
    y: 20,
    radius: 80,
    strength: 1000,
    direction: 90,
    orientation: 45
  });

  const serialized = field.serialize();
  assert.equal(serialized.geometry?.radius, 100);
});
