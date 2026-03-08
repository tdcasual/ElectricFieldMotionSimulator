import test from 'node:test';
import assert from 'node:assert/strict';
import { Particle } from '../js/objects/Particle.js';
import { Scene } from '../js/core/Scene.js';
import { Integrator } from '../js/physics/Integrator.js';

test('Particle provides defaults and schema', () => {
  const d = Particle.defaults();
  assert.equal(d.type, 'particle');
  const s = Particle.schema();
  assert.ok(Array.isArray(s));
});


test('Integrator stops recording trajectory when scene trajectories are globally hidden', () => {
  const scene = new Scene();
  scene.settings.showTrajectories = false;
  scene.time = 1;

  const particle = new Particle({ x: 0, y: 0, vx: 1, vy: 0, showTrajectory: true });
  scene.addObject(particle);
  particle.trajectory = [{ x: 0, y: 0, t: 0 }];

  const integrator = new Integrator();
  integrator.updateParticle(particle, scene, 0.016, 10);

  assert.equal(particle.trajectory.length, 1);
});
