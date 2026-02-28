import assert from 'node:assert/strict';
import test from 'node:test';

import { Scene } from '../js/core/Scene.js';
import { RectElectricField } from '../js/objects/RectElectricField.js';
import { Particle } from '../js/objects/Particle.js';
import { ProgrammableEmitter } from '../js/objects/ProgrammableEmitter.js';
import { Presets } from '../js/presets/Presets.js';
import { Serializer } from '../js/utils/Serializer.js';

function withLocalStorageMock(mock, run) {
  const hadLocalStorage = Object.prototype.hasOwnProperty.call(globalThis, 'localStorage');
  const original = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: mock
  });
  try {
    run();
  } finally {
    if (hadLocalStorage) {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        writable: true,
        value: original
      });
    } else {
      // @ts-ignore
      delete globalThis.localStorage;
    }
  }
}

function withMutedConsoleError(run) {
  const original = console.error;
  console.error = () => {};
  try {
    run();
  } finally {
    console.error = original;
  }
}

test('Scene.duplicateObject creates a new id and preserves particle properties', () => {
  const scene = new Scene();
  const particle = new Particle({
    x: 10,
    y: 20,
    vx: 3,
    vy: 4,
    mass: 2,
    charge: -1,
    radius: 5,
    ignoreGravity: true
  });

  scene.addObject(particle);
  const dup = scene.duplicateObject(particle);

  assert.equal(dup.type, 'particle');
  assert.notEqual(dup.id, particle.id);
  assert.equal(dup.mass, particle.mass);
  assert.equal(dup.charge, particle.charge);
  assert.equal(dup.velocity.x, particle.velocity.x);
  assert.equal(dup.velocity.y, particle.velocity.y);
  assert.equal(dup.position.x, particle.position.x + 20);
  assert.equal(dup.position.y, particle.position.y + 20);
});

test('Scene.duplicateObject offsets x/y and preserves properties for fields', () => {
  const scene = new Scene();
  const field = new RectElectricField({
    x: 100,
    y: 200,
    width: 50,
    height: 60,
    strength: 123,
    direction: 45
  });

  scene.addObject(field);
  const dup = scene.duplicateObject(field);

  assert.equal(dup.type, 'electric-field-rect');
  assert.notEqual(dup.id, field.id);
  assert.equal(dup.x, field.x + 20);
  assert.equal(dup.y, field.y + 20);
  assert.equal(dup.width, field.width);
  assert.equal(dup.height, field.height);
  assert.equal(dup.strength, field.strength);
  assert.equal(dup.direction, field.direction);
});

test('Scene.removeObject clears selected object when removing current selection', () => {
  const scene = new Scene();
  const field = new RectElectricField({
    x: 10,
    y: 20,
    width: 30,
    height: 40
  });

  scene.addObject(field);
  scene.selectedObject = field;
  scene.removeObject(field);

  assert.equal(scene.selectedObject, null);
  assert.equal(scene.objects.includes(field), false);
  assert.equal(scene.electricFields.includes(field), false);
});

test('Scene.addObject keeps category lists unique for the same object instance', () => {
  const scene = new Scene();
  const field = new RectElectricField({
    x: 10,
    y: 20,
    width: 30,
    height: 40
  });

  scene.addObject(field);
  scene.addObject(field);

  assert.equal(scene.objects.length, 1);
  assert.equal(scene.electricFields.length, 1);
  assert.equal(scene.electricFields[0], field);
});

test('Scene.loadFromData clears stale selection that is no longer in scene', () => {
  const scene = new Scene();
  const original = new RectElectricField({
    x: 10,
    y: 20,
    width: 30,
    height: 40
  });
  scene.addObject(original);
  scene.selectedObject = original;

  scene.loadFromData({
    version: '1.0',
    objects: [
      {
        type: 'electric-field-rect',
        x: 100,
        y: 200,
        width: 50,
        height: 60,
        strength: 120,
        direction: 0
      }
    ]
  });

  assert.equal(scene.selectedObject, null);
  assert.equal(scene.objects.includes(original), false);
});

test('Serializer.validateSceneData fills missing objects array', () => {
  const data = { version: '1.0' };
  const result = Serializer.validateSceneData(data);

  assert.equal(result.valid, true);
  assert.deepEqual(data.objects, []);
});

test('Serializer.validateSceneData rejects invalid objects array', () => {
  const data = {
    version: '1.0',
    objects: {}
  };

  const result = Serializer.validateSceneData(data);
  assert.equal(result.valid, false);
  assert.equal(result.error, '对象数据格式无效');
});

test('Serializer.saveSceneData returns false when storage write throws', () => {
  withMutedConsoleError(() => {
    withLocalStorageMock(
      {
        setItem() {
          throw new Error('QuotaExceededError');
        }
      },
      () => {
        const ok = Serializer.saveSceneData({ version: '1.0', objects: [] }, 'demo');
        assert.equal(ok, false);
      }
    );
  });
});

test('Serializer.loadScene returns null when storage read throws', () => {
  withMutedConsoleError(() => {
    withLocalStorageMock(
      {
        getItem() {
          throw new Error('SecurityError');
        }
      },
      () => {
        const data = Serializer.loadScene('demo');
        assert.equal(data, null);
      }
    );
  });
});

test('Serializer.listScenes returns empty list when storage length access throws', () => {
  withMutedConsoleError(() => {
    withLocalStorageMock(
      {
        key() {
          return null;
        },
        get length() {
          throw new Error('SecurityError');
        }
      },
      () => {
        const scenes = Serializer.listScenes();
        assert.deepEqual(scenes, []);
      }
    );
  });
});

test('Serializer.deleteScene returns false when storage remove throws', () => {
  withMutedConsoleError(() => {
    withLocalStorageMock(
      {
        removeItem() {
          throw new Error('SecurityError');
        }
      },
      () => {
        const ok = Serializer.deleteScene('demo');
        assert.equal(ok, false);
      }
    );
  });
});

test('Particle.deserialize ignores legacy x/y/vx/vy kinematics payload', () => {
  const particle = new Particle({ x: 1, y: 2, vx: 3, vy: 4 });

  particle.deserialize({
    x: 10,
    y: 20,
    vx: 30,
    vy: 40,
    mass: 1,
    charge: -2
  });

  assert.equal(particle.position.x, 1);
  assert.equal(particle.position.y, 2);
  assert.equal(particle.velocity.x, 3);
  assert.equal(particle.velocity.y, 4);
  assert.equal(particle.mass, 1);
  assert.equal(particle.charge, -2);
});

test('Scene.loadFromData loads built-in presets', () => {
  const scene = new Scene();
  for (const key of Presets.getAll().map(p => p.key)) {
    const preset = Presets.get(key);
    assert.ok(preset, `Missing preset: ${key}`);
    scene.clear();
    scene.loadFromData(preset.data);
    assert.ok(scene.getAllObjects().length > 0, `Preset ${key} should create objects`);
  }
});

test('Scene.loadFromData loads programmable emitters', () => {
  const scene = new Scene();
  const emitterData = {
    type: 'programmable-emitter',
    x: 10,
    y: 20,
    startTime: 1,
    emissionMode: 'sequence',
    emissionCount: 5,
    emissionInterval: 0.1,
    angleMode: 'list',
    angleList: [0, 30, 60],
    angleListMode: 'sequential',
    angleListLoop: false,
    speedMode: 'arithmetic',
    speedMin: 100,
    speedMax: 300,
    particleType: 'proton',
    keepTrajectory: false
  };

  scene.loadFromData({
    version: '1.0',
    objects: [emitterData]
  });

  assert.equal(scene.emitters.length, 1);
  const emitter = scene.emitters[0];
  assert.ok(emitter instanceof ProgrammableEmitter);
  assert.equal(emitter.type, 'programmable-emitter');
  assert.equal(emitter.x, 10);
  assert.equal(emitter.y, 20);
  assert.equal(emitter.startTime, 1);
  assert.equal(emitter.emissionMode, 'sequence');
  assert.equal(emitter.emissionCount, 5);
  assert.equal(emitter.emissionInterval, 0.1);
  assert.equal(emitter.angleMode, 'list');
  assert.deepEqual(emitter.angleList, [0, 30, 60]);
  assert.equal(emitter.angleListMode, 'sequential');
  assert.equal(emitter.angleListLoop, false);
  assert.equal(emitter.speedMode, 'arithmetic');
  assert.equal(emitter.speedMin, 100);
  assert.equal(emitter.speedMax, 300);
  assert.equal(emitter.particleType, 'proton');
  assert.equal(emitter.keepTrajectory, false);

  const saved = scene.serialize();
  assert.equal(saved.objects.length, 1);
  assert.equal(saved.objects[0].type, 'programmable-emitter');
  assert.equal(saved.objects[0].emissionMode, 'sequence');
  assert.equal(saved.objects[0].speedMode, 'arithmetic');
 });
