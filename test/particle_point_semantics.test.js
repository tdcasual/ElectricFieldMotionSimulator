import test from 'node:test';
import assert from 'node:assert/strict';

import { PhysicsEngine } from '../js/core/PhysicsEngine.js';
import { Particle } from '../js/objects/Particle.js';
import { Scene } from '../js/core/Scene.js';

test('boundary bounce treats particle as point regardless of radius', () => {
  const engine = new PhysicsEngine();
  const scene = {
    settings: {
      boundaryMode: 'bounce',
      boundaryMargin: 0
    }
  };

  let cleared = false;
  const particle = {
    position: { x: -5, y: 40 },
    velocity: { x: -12, y: 0 },
    radius: 999,
    clearTrajectory: () => {
      cleared = true;
    }
  };

  const removed = engine.handleBoundaries(particle, scene, 100, 100);

  assert.equal(removed, false);
  assert.equal(particle.position.x, 0);
  assert.ok(particle.velocity.x > 0);
  assert.equal(cleared, true);
});

test('boundary remove mode no longer extends by radius', () => {
  const engine = new PhysicsEngine();
  const scene = {
    settings: {
      boundaryMode: 'remove',
      boundaryMargin: 0
    }
  };

  const particle = {
    position: { x: -0.1, y: 50 },
    velocity: { x: 0, y: 0 },
    radius: 999
  };

  const removed = engine.handleBoundaries(particle, scene, 100, 100);
  assert.equal(removed, true);
});

test('physics update removes out-of-bounds particles from scene object graph', () => {
  const engine = new PhysicsEngine();
  const scene = new Scene();
  scene.setViewport(100, 100);
  scene.settings.boundaryMode = 'remove';
  scene.settings.boundaryMargin = 0;

  const particle = new Particle({ x: -1, y: 40, vx: 0, vy: 0, ignoreGravity: true });
  scene.addObject(particle);
  scene.selectedObject = particle;

  engine.update(scene, 1 / 60);

  assert.equal(scene.particles.includes(particle), false);
  assert.equal(scene.objects.includes(particle), false);
  assert.equal(scene.selectedObject, null);
  assert.equal(scene.serialize().objects.includes(particle), false);
});

test('Particle.containsPoint keeps fixed tolerance when renderer metric is unavailable', () => {
  const particle = new Particle({ x: 0, y: 0, radius: 1000 });
  assert.equal(particle.containsPoint(9, 0), true);
  assert.equal(particle.containsPoint(12, 0), false);
});

test('Particle.containsPoint expands with renderer particle radius on mobile', () => {
  const particle = new Particle({ x: 0, y: 0, radius: 1000 });
  particle.scene = {
    renderer: {
      particleRenderRadius: 13
    }
  };

  assert.equal(particle.containsPoint(12, 0), true);
  assert.equal(particle.containsPoint(14, 0), true);
  assert.equal(particle.containsPoint(15, 0), false);
});
