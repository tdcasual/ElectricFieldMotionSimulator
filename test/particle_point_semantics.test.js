import test from 'node:test';
import assert from 'node:assert/strict';

import { PhysicsEngine } from '../js/core/PhysicsEngine.js';
import { Particle } from '../js/objects/Particle.js';

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

test('Particle.containsPoint uses fixed picking tolerance in point mode', () => {
  const particle = new Particle({ x: 0, y: 0, radius: 1000 });
  assert.equal(particle.containsPoint(9, 0), true);
  assert.equal(particle.containsPoint(12, 0), false);
});
