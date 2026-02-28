import test from 'node:test';
import assert from 'node:assert/strict';

import { ElectronGun } from '../js/objects/ElectronGun.js';
import { Particle } from '../js/objects/Particle.js';

test('ElectronGun uses velocityDisplayMode and ignores legacy velocityDisplay alias', () => {
  const gun = new ElectronGun({ velocityDisplay: 'speed' });
  assert.equal(gun.velocityDisplayMode, 'vector');

  gun.deserialize({ velocityDisplay: 'speed' });
  assert.equal(gun.velocityDisplayMode, 'vector');

  gun.deserialize({ velocityDisplayMode: 'speed' });
  assert.equal(gun.velocityDisplayMode, 'speed');
});

test('Particle uses velocityDisplayMode and ignores legacy velocityDisplay alias', () => {
  const particle = new Particle({ velocityDisplay: 'speed' });
  assert.equal(particle.velocityDisplayMode, 'vector');

  particle.deserialize({ velocityDisplay: 'speed' });
  assert.equal(particle.velocityDisplayMode, 'vector');

  particle.deserialize({ velocityDisplayMode: 'speed' });
  assert.equal(particle.velocityDisplayMode, 'speed');
});
