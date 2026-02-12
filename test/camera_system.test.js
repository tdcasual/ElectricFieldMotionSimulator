import test from 'node:test';
import assert from 'node:assert/strict';

import { Scene } from '../js/core/Scene.js';
import { PhysicsEngine } from '../js/core/PhysicsEngine.js';

test('Scene converts coordinates between screen and world using camera offset', () => {
  const scene = new Scene();
  scene.setCamera(120, -80);

  const world = scene.toWorldPoint(30, 40);
  assert.deepEqual(world, { x: -90, y: 120 });

  const screen = scene.toScreenPoint(world.x, world.y);
  assert.deepEqual(screen, { x: 30, y: 40 });
});

test('Scene serialize/load keeps camera offset', () => {
  const scene = new Scene();
  scene.setCamera(12, 34);

  const saved = scene.serialize();
  assert.deepEqual(saved.camera, { offsetX: 12, offsetY: 34 });

  const reloaded = new Scene();
  reloaded.loadFromData(saved);
  assert.deepEqual(reloaded.camera, { offsetX: 12, offsetY: 34 });
});

test('PhysicsEngine boundary bounce respects camera-shifted viewport', () => {
  const engine = new PhysicsEngine();
  const scene = {
    settings: {
      boundaryMode: 'bounce',
      boundaryMargin: 0
    },
    camera: {
      offsetX: 50,
      offsetY: 0
    }
  };

  let cleared = false;
  const particle = {
    position: { x: -55, y: 20 },
    velocity: { x: -10, y: 0 },
    clearTrajectory: () => {
      cleared = true;
    }
  };

  const removed = engine.handleBoundaries(particle, scene, 100, 100);
  assert.equal(removed, false);
  assert.equal(particle.position.x, -50);
  assert.ok(particle.velocity.x > 0);
  assert.equal(cleared, true);
});

test('PhysicsEngine boundary remove respects camera-shifted viewport', () => {
  const engine = new PhysicsEngine();
  const scene = {
    settings: {
      boundaryMode: 'remove',
      boundaryMargin: 0
    },
    camera: {
      offsetX: 50,
      offsetY: 10
    }
  };

  const particle = {
    position: { x: 51, y: -10 },
    velocity: { x: 0, y: 0 }
  };

  const removed = engine.handleBoundaries(particle, scene, 100, 100);
  assert.equal(removed, true);
});
