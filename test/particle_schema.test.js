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


test('Particle collapses duplicate stationary trajectory samples into a single point', () => {
  const particle = new Particle({ x: 0, y: 0, vx: 0, vy: 0, showTrajectory: true });

  particle.addTrajectoryPoint(12, 24, 0);
  particle.addTrajectoryPoint(12, 24, 0.016);
  particle.addTrajectoryPoint(12, 24, 0.032);

  assert.equal(particle.trajectory.length, 1);
  assert.deepEqual(particle.trajectory[0], { x: 12, y: 24, t: 0.032 });
});
