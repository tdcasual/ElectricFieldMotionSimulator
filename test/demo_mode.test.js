import test from 'node:test';
import assert from 'node:assert/strict';

import { Scene } from '../js/core/Scene.js';
import { Particle } from '../js/objects/Particle.js';
import { RectElectricField } from '../js/objects/RectElectricField.js';
import { ElectronGun } from '../js/objects/ElectronGun.js';
import { ProgrammableEmitter } from '../js/objects/ProgrammableEmitter.js';
import {
  normalizeDemoDefaults,
  buildDemoCreationOverrides,
  getNextDemoZoom,
  applyDemoZoomToScene
} from '../js/modes/DemoMode.js';

function closeTo(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${actual} ≈ ${expected}`);
}

test('normalizeDemoDefaults keeps angular fields at 0 and other finite numbers at 1', () => {
  const input = {
    type: 'particle',
    direction: 90,
    orientation: 180,
    angle: 45,
    angleMin: -30,
    angleMax: 360,
    mass: 9.109e-31,
    radius: 6,
    showEnergy: true,
    meta: {
      speed: 200,
      nested: [0, 2, 'keep']
    }
  };

  const out = normalizeDemoDefaults(input);

  assert.equal(out.type, 'particle');
  assert.equal(out.direction, 0);
  assert.equal(out.orientation, 0);
  assert.equal(out.angle, 0);
  assert.equal(out.angleMin, 0);
  assert.equal(out.angleMax, 0);
  assert.equal(out.mass, 1);
  assert.equal(out.radius, 1);
  assert.equal(out.showEnergy, true);
  assert.equal(out.meta.speed, 1);
  assert.deepEqual(out.meta.nested, [1, 1, 'keep']);
});

test('buildDemoCreationOverrides normalizes numbers and scales px-space fields', () => {
  const entry = {
    defaults: () => ({
      type: 'particle',
      direction: 90,
      vx: 0,
      vy: 0,
      radius: 6,
      mass: 9.109e-31,
      ignoreGravity: false,
      speedList: [120, 240]
    })
  };

  const out = buildDemoCreationOverrides(entry, 50);

  assert.equal(out.direction, 0);
  assert.equal(out.vx, 50);
  assert.equal(out.vy, 50);
  assert.equal(out.radius, 50);
  assert.equal(out.mass, 1);
  assert.equal(out.ignoreGravity, true);
  assert.deepEqual(out.speedList, [50, 50]);
});

test('demo overrides keep electron-gun and programmable-emitter launch angle at 0', async () => {
  const { registry } = await import('../js/core/registerObjects.js');
  const gun = buildDemoCreationOverrides(registry.get('electron-gun'), 50);
  const emitter = buildDemoCreationOverrides(registry.get('programmable-emitter'), 50);

  assert.equal(gun.direction, 0);
  assert.ok(gun.emissionRate > 0);
  assert.ok(gun.emissionSpeed > 0);

  assert.equal(emitter.direction, 0);
  assert.equal(emitter.angleMin, 0);
  assert.equal(emitter.angleMax, 0);
  assert.ok(emitter.emissionCount > 0);
});

test('demo overrides normalize emitter barrelLength to unit baseline', async () => {
  const { registry } = await import('../js/core/registerObjects.js');
  const gun = buildDemoCreationOverrides(registry.get('electron-gun'), 50);
  const emitter = buildDemoCreationOverrides(registry.get('programmable-emitter'), 50);

  assert.equal(gun.barrelLength, 50);
  assert.equal(emitter.barrelLength, 50);
});

test('getNextDemoZoom applies wheel direction and clamps to bounds', () => {
  const zoomIn = getNextDemoZoom(1, -100, { step: 1.1, min: 0.1, max: 20 });
  const zoomOut = getNextDemoZoom(1, 100, { step: 1.1, min: 0.1, max: 20 });
  assert.ok(zoomIn > 1);
  assert.ok(zoomOut < 1);

  const subtle = getNextDemoZoom(1, -2, { step: 1.1, min: 0.1, max: 20 });
  const aggressive = getNextDemoZoom(1, -100, { step: 1.1, min: 0.1, max: 20 });
  assert.ok((subtle - 1) < (aggressive - 1));

  assert.equal(getNextDemoZoom(0.1, 1000, { step: 1.1, min: 0.1, max: 20 }), 0.1);
  assert.equal(getNextDemoZoom(20, -1000, { step: 1.1, min: 0.1, max: 20 }), 20);
});

test('applyDemoZoomToScene rescales objects around anchor and updates scene scale', () => {
  const scene = new Scene();
  scene.settings.pixelsPerMeter = 50;
  scene.settings.boundaryMargin = 50;

  const particle = new Particle({ x: 10, y: 20, vx: 50, vy: 100, radius: 5 });
  particle.trajectory = [{ x: 10, y: 20, t: 0 }];
  scene.addObject(particle);

  const field = new RectElectricField({ x: 30, y: 40, width: 20, height: 10 });
  scene.addObject(field);

  const changed = applyDemoZoomToScene(scene, {
    newPixelsPerMeter: 100,
    anchorX: 5,
    anchorY: 5
  });

  assert.equal(changed, true);
  assert.equal(scene.settings.pixelsPerMeter, 100);
  assert.equal(scene.settings.boundaryMargin, 100);

  closeTo(particle.position.x, 15);
  closeTo(particle.position.y, 35);
  closeTo(particle.velocity.x, 100);
  closeTo(particle.velocity.y, 200);
  closeTo(particle.radius, 10);
  closeTo(particle.trajectory[0].x, 15);
  closeTo(particle.trajectory[0].y, 35);

  closeTo(field.x, 55);
  closeTo(field.y, 75);
  closeTo(field.width, 40);
  closeTo(field.height, 20);
});

test('applyDemoZoomToScene rescales emitter barrelLength with display scale', () => {
  const scene = new Scene();
  scene.settings.pixelsPerMeter = 50;

  const gun = new ElectronGun({ x: 100, y: 100, barrelLength: 25 });
  const emitter = new ProgrammableEmitter({ x: 150, y: 150, barrelLength: 25 });
  scene.addObject(gun);
  scene.addObject(emitter);

  const changed = applyDemoZoomToScene(scene, {
    newPixelsPerMeter: 100,
    anchorX: 0,
    anchorY: 0
  });

  assert.equal(changed, true);
  assert.equal(gun.barrelLength, 50);
  assert.equal(emitter.barrelLength, 50);
});
