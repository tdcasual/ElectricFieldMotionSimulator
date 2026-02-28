import test from 'node:test';
import assert from 'node:assert/strict';

import { Scene } from '../js/core/Scene.js';
import { ElectronGun } from '../js/objects/ElectronGun.js';
import { ProgrammableEmitter } from '../js/objects/ProgrammableEmitter.js';

test('ElectronGun emits particle from emitter center point', () => {
  const scene = new Scene();
  const gun = new ElectronGun({
    x: 120,
    y: 80,
    direction: 45,
    emissionSpeed: 200
  });

  gun.emitParticle(scene);

  assert.equal(scene.particles.length, 1);
  const particle = scene.particles[0];
  assert.equal(particle.position.x, 120);
  assert.equal(particle.position.y, 80);
  assert.equal(Object.prototype.hasOwnProperty.call(gun, 'barrelLength'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(gun.serialize(), 'barrelLength'), false);
});

test('ProgrammableEmitter emits particle from emitter center point', () => {
  const scene = new Scene();
  const emitter = new ProgrammableEmitter({
    x: 33,
    y: 44,
    direction: 270,
    emissionSpeed: 300
  });

  emitter.emitParticle(scene, 1);

  assert.equal(scene.particles.length, 1);
  const particle = scene.particles[0];
  assert.equal(particle.position.x, 33);
  assert.equal(particle.position.y, 44);
  assert.equal(Object.prototype.hasOwnProperty.call(emitter, 'barrelLength'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(emitter.serialize(), 'barrelLength'), false);
});
