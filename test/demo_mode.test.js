import test from 'node:test';
import assert from 'node:assert/strict';

import { Scene } from '../js/core/Scene.js';
import { Particle } from '../js/objects/Particle.js';
import { RectElectricField } from '../js/objects/RectElectricField.js';
import { FluorescentScreen } from '../js/objects/FluorescentScreen.js';
import {
  normalizeDemoDefaults,
  buildDemoCreationOverrides,
  getNextDemoZoom,
  applyDemoZoomToScene
} from '../js/modes/DemoMode.js';

function closeTo(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${actual} ≈ ${expected}`);
}

test('normalizeDemoDefaults sets finite numbers to 1 recursively', () => {
  const input = {
    type: 'particle',
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
      vx: 0,
      vy: 0,
      radius: 6,
      mass: 9.109e-31,
      ignoreGravity: false,
      speedList: [120, 240]
    })
  };

  const out = buildDemoCreationOverrides(entry, 50);

  assert.equal(out.vx, 50);
  assert.equal(out.vy, 50);
  assert.equal(out.radius, 50);
  assert.equal(out.mass, 1);
  assert.equal(out.ignoreGravity, true);
  assert.deepEqual(out.speedList, [50, 50]);
});

test('getNextDemoZoom applies wheel direction and clamps to bounds', () => {
  assert.equal(getNextDemoZoom(1, -100, { step: 1.1, min: 0.1, max: 20 }), 1.1);
  closeTo(getNextDemoZoom(1, 100, { step: 1.1, min: 0.1, max: 20 }), 1 / 1.1);
  assert.equal(getNextDemoZoom(0.1, 100, { step: 1.1, min: 0.1, max: 20 }), 0.1);
  assert.equal(getNextDemoZoom(20, -100, { step: 1.1, min: 0.1, max: 20 }), 20);
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

  const screen = new FluorescentScreen({ x: 80, y: 60, width: 10, height: 12, spotSize: 2 });
  screen.hits = [{ x: 0, y: 5, time: 1 }];
  scene.addObject(screen);

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

  closeTo(screen.x, 155);
  closeTo(screen.y, 115);
  closeTo(screen.width, 20);
  closeTo(screen.height, 24);
  closeTo(screen.hits[0].x, 0);
  closeTo(screen.hits[0].y, 10);
});
