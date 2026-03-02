import test from 'node:test';
import assert from 'node:assert/strict';
import { MagneticField } from '../js/objects/MagneticField.js';
import { registry } from '../js/core/registerObjects.js';

test('MagneticField provides defaults and schema', () => {
  assert.equal(MagneticField.defaults().type, 'magnetic-field');
  assert.ok(Array.isArray(MagneticField.schema()));
});

test('MagneticField serializes unified geometry for circle and polygon', () => {
  const circle = new MagneticField({
    x: 100,
    y: 120,
    geometry: {
      kind: 'circle',
      radius: 45
    },
    strength: 0.5
  });

  const circleSerialized = circle.serialize();
  assert.equal(circleSerialized.geometry?.kind, 'circle');
  assert.equal(circleSerialized.geometry?.radius, 45);
  assert.equal(Object.prototype.hasOwnProperty.call(circleSerialized, 'vertices'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(circleSerialized, 'width'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(circleSerialized, 'height'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(circleSerialized, 'radius'), false);
  assert.equal(circle.containsPoint(130, 120), true);
  assert.equal(circle.containsPoint(200, 120), false);

  const polygon = new MagneticField({
    x: 50,
    y: 60,
    geometry: {
      kind: 'polygon',
      vertices: [
        { x: 0, y: 0 },
        { x: 80, y: 0 },
        { x: 40, y: 60 }
      ]
    },
    strength: 0.5
  });
  const polygonSerialized = polygon.serialize();
  assert.equal(polygonSerialized.geometry?.kind, 'polygon');
  assert.equal(Object.prototype.hasOwnProperty.call(polygonSerialized, 'vertices'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(polygonSerialized, 'width'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(polygonSerialized, 'height'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(polygonSerialized, 'radius'), false);
  assert.equal(polygon.containsPoint(90, 90), true);
  assert.equal(polygon.containsPoint(10, 10), false);
});

test('MagneticField serialization no longer includes legacy shape field', () => {
  const circle = new MagneticField({
    x: 100,
    y: 120,
    geometry: {
      kind: 'circle',
      radius: 45
    },
    strength: 0.5
  });

  const serialized = circle.serialize();
  assert.equal(Object.prototype.hasOwnProperty.call(serialized, 'shape'), false);
});

test('magnetic registry variants create objects with geometry defaults', () => {
  const circle = registry.create('magnetic-field-circle');
  const triangle = registry.create('magnetic-field-triangle');
  assert.equal(circle.serialize().geometry?.kind, 'circle');
  assert.equal(triangle.serialize().geometry?.kind, 'polygon');
});
