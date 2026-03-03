import test from 'node:test';
import assert from 'node:assert/strict';
import { ElectronGun } from '../js/objects/ElectronGun.js';
import { ProgrammableEmitter } from '../js/objects/ProgrammableEmitter.js';

test('device objects provide defaults and schema', () => {
  assert.equal(ElectronGun.defaults().type, 'electron-gun');
  assert.ok(Array.isArray(ElectronGun.schema()));
});

test('ElectronGun update enforces per-tick emission cap', () => {
  const gun = new ElectronGun({ emissionRate: 1e9 });
  const emitted = [];
  gun.emitParticle = () => {
    emitted.push(1);
  };

  gun.update(1, {});
  assert.equal(emitted.length, 2000);
});

test('ElectronGun deserialize clamps emissionRate upper bound', () => {
  const gun = new ElectronGun({ emissionRate: 1 });
  gun.deserialize({ emissionRate: 1e9 });
  assert.equal(gun.emissionRate, 20000);
});

test('ProgrammableEmitter update enforces per-tick emission cap in burst mode', () => {
  const emitter = new ProgrammableEmitter({
    emissionMode: 'burst',
    emissionCount: 100000,
    startTime: 0
  });
  const scene = {
    time: 1,
    addObject() {}
  };
  let emitted = 0;
  emitter.emitParticle = () => {
    emitted += 1;
  };

  emitter.update(0.016, scene);
  assert.equal(emitted, 2000);
  assert.equal(emitter._burstDone, false);
});

test('ProgrammableEmitter deserialize clamps emissionCount and interval', () => {
  const emitter = new ProgrammableEmitter();
  emitter.deserialize({
    emissionCount: 999999,
    emissionInterval: 999
  });

  assert.equal(emitter.emissionCount, 5000);
  assert.equal(emitter.emissionInterval, 60);
});
