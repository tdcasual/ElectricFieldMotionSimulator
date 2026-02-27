import test from 'node:test';
import assert from 'node:assert/strict';

import { Scene } from '../js/core/Scene.js';
import { MagneticField } from '../js/objects/MagneticField.js';
import { applyDemoZoomToScene } from '../js/modes/DemoMode.js';
import {
  captureObjectRealGeometry,
  ensureObjectGeometryState,
  getObjectGeometryScale,
  getObjectRealDimension,
  setObjectDisplayDimension,
  setObjectRealDimension
} from '../js/modes/GeometryScaling.js';

test('ensureObjectGeometryState derives real geometry from scene scale', () => {
  const scene = new Scene();
  scene.settings.pixelsPerMeter = 50;

  const field = new MagneticField({
    shape: 'circle',
    x: 0,
    y: 0,
    radius: 50,
    width: 100,
    height: 100
  });

  ensureObjectGeometryState(field, scene);

  assert.equal(getObjectRealDimension(field, 'radius', scene), 1);
  assert.equal(getObjectRealDimension(field, 'width', scene), 2);
  assert.equal(getObjectGeometryScale(field), 1);
});

test('setObjectRealDimension updates display geometry using scene scale', () => {
  const scene = new Scene();
  scene.settings.pixelsPerMeter = 50;

  const field = new MagneticField({
    shape: 'circle',
    x: 0,
    y: 0,
    radius: 50,
    width: 100,
    height: 100
  });

  ensureObjectGeometryState(field, scene);
  setObjectRealDimension(field, 'radius', 2, scene);

  assert.equal(getObjectRealDimension(field, 'radius', scene), 2);
  assert.equal(field.radius, 100);
});

test('setObjectDisplayDimension updates only object scale and keeps real geometry stable', () => {
  const scene = new Scene();
  scene.settings.pixelsPerMeter = 50;

  const field = new MagneticField({
    shape: 'rect',
    x: 0,
    y: 0,
    width: 100,
    height: 150,
    radius: 50
  });

  ensureObjectGeometryState(field, scene);
  setObjectDisplayDimension(field, 'width', 300, scene);

  assert.equal(getObjectRealDimension(field, 'width', scene), 2);
  assert.equal(getObjectGeometryScale(field), 3);
  assert.equal(field.width, 300);
  assert.equal(field.height, 450);
});

test('captureObjectRealGeometry syncs real dimensions after direct display-space resize', () => {
  const scene = new Scene();
  scene.settings.pixelsPerMeter = 50;

  const field = new MagneticField({
    shape: 'rect',
    x: 0,
    y: 0,
    width: 100,
    height: 150
  });

  ensureObjectGeometryState(field, scene);
  field.width = 250;
  field.height = 350;
  captureObjectRealGeometry(field, scene);

  assert.equal(getObjectRealDimension(field, 'width', scene), 5);
  assert.equal(getObjectRealDimension(field, 'height', scene), 7);
});

test('applyDemoZoomToScene changes display dimensions without mutating real geometry', () => {
  const scene = new Scene();
  scene.settings.pixelsPerMeter = 50;

  const field = new MagneticField({
    shape: 'circle',
    x: 20,
    y: 30,
    radius: 50,
    width: 100,
    height: 100
  });

  scene.addObject(field);
  ensureObjectGeometryState(field, scene);

  const changed = applyDemoZoomToScene(scene, {
    newPixelsPerMeter: 100,
    anchorX: 0,
    anchorY: 0
  });

  assert.equal(changed, true);
  assert.equal(field.radius, 100);
  assert.equal(getObjectRealDimension(field, 'radius', scene), 1);
});
