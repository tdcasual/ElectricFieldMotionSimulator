# Object Registry + Schema Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hard-coded type dispatch with ObjectRegistry and a schema-driven PropertyPanel so new device types register once and gain full UI/render/physics support.

**Architecture:** Introduce ObjectRegistry and SchemaForm; move toolbar creation, scene load, renderer dispatch, and property editing to registry-driven metadata; keep physics/render behavior identical while routing via hooks. Scene format becomes a flat objects array (breaking change).

**Tech Stack:** ES modules, vanilla JS, HTML/CSS, Node test runner (`node --test`).

---

### Task 1: Add ObjectRegistry core + tests

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/core/ObjectRegistry.js`
- Test: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/test/object_registry.test.js`

**Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectRegistry } from '../js/core/ObjectRegistry.js';

test('ObjectRegistry register/get/create/listByCategory', () => {
  const registry = new ObjectRegistry();
  class Dummy { static defaults() { return { x: 1 }; } }
  registry.register('dummy', {
    class: Dummy,
    label: 'Dummy',
    category: 'test',
    defaults: Dummy.defaults
  });

  assert.equal(registry.get('dummy').label, 'Dummy');
  const inst = registry.create('dummy', { x: 2 });
  assert.equal(inst.constructor, Dummy);
  assert.equal(inst.x, 2);

  const cats = registry.listByCategory();
  assert.deepEqual(cats.test[0].type, 'dummy');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/object_registry.test.js`
Expected: FAIL with "Cannot find module".

**Step 3: Write minimal implementation**

```js
export class ObjectRegistry {
  constructor() {
    this.map = new Map();
  }

  register(type, meta) {
    if (!type || !meta || !meta.class) throw new Error('Invalid registry entry');
    this.map.set(type, { type, ...meta });
  }

  get(type) {
    return this.map.get(type) || null;
  }

  create(type, overrides = {}) {
    const entry = this.get(type);
    if (!entry) throw new Error(`Unknown type: ${type}`);
    const defaults = typeof entry.defaults === 'function' ? entry.defaults() : {};
    const data = { ...defaults, ...overrides, type };
    const instance = new entry.class(data);
    if (typeof instance.deserialize === 'function') {
      instance.deserialize(data);
    }
    return instance;
  }

  listByCategory() {
    const out = {};
    for (const entry of this.map.values()) {
      const key = entry.category || 'misc';
      out[key] = out[key] || [];
      out[key].push(entry);
    }
    return out;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `node --test test/object_registry.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add test/object_registry.test.js js/core/ObjectRegistry.js
git commit -m "feat: add object registry core"
```

---

### Task 2: Add registry bootstrap (all types) + coverage test

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/core/registerObjects.js`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/main.js`
- Test: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/test/object_registry.test.js`

**Step 1: Write the failing test**

```js
test('registry registers all built-in types', () => {
  const { registry } = await import('../js/core/registerObjects.js');
  const types = [
    'electric-field-rect',
    'electric-field-circle',
    'semicircle-electric-field',
    'parallel-plate-capacitor',
    'vertical-parallel-plate-capacitor',
    'magnetic-field',
    'particle',
    'electron-gun',
    'programmable-emitter',
    'fluorescent-screen',
    'disappear-zone'
  ];
  for (const type of types) {
    assert.ok(registry.get(type), `missing ${type}`);
  }
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/object_registry.test.js`
Expected: FAIL with "Cannot find module registerObjects".

**Step 3: Write minimal implementation**

```js
import { ObjectRegistry } from './ObjectRegistry.js';
import { RectElectricField } from '../objects/RectElectricField.js';
import { CircleElectricField } from '../objects/CircleElectricField.js';
import { SemiCircleElectricField } from '../objects/SemiCircleElectricField.js';
import { ParallelPlateCapacitor } from '../objects/ParallelPlateCapacitor.js';
import { VerticalParallelPlateCapacitor } from '../objects/VerticalParallelPlateCapacitor.js';
import { MagneticField } from '../objects/MagneticField.js';
import { Particle } from '../objects/Particle.js';
import { ElectronGun } from '../objects/ElectronGun.js';
import { ProgrammableEmitter } from '../objects/ProgrammableEmitter.js';
import { FluorescentScreen } from '../objects/FluorescentScreen.js';
import { DisappearZone } from '../objects/DisappearZone.js';

export const registry = new ObjectRegistry();

registry.register('electric-field-rect', {
  class: RectElectricField,
  label: '均匀电场',
  category: 'electric',
  defaults: RectElectricField.defaults,
  schema: RectElectricField.schema,
  rendererKey: 'electric'
});

// Repeat for all other types with appropriate label/category/rendererKey.
// Keep labels aligned with existing toolbar text.
```

Also import and expose `registry` in `js/main.js` so UI modules can access it:

```js
import { registry } from './core/registerObjects.js';
window.registry = registry;
```

**Step 4: Run test to verify it passes**

Run: `node --test test/object_registry.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add js/core/registerObjects.js js/main.js test/object_registry.test.js
git commit -m "feat: add built-in registry entries"
```

---

### Task 3: Add schema helpers for common fields

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/ui/schemaHelpers.js`
- Test: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/test/schema_helpers.test.js`

**Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldPosition, fieldSize } from '../js/ui/schemaHelpers.js';

test('schema helpers return field descriptors', () => {
  const pos = fieldPosition();
  assert.equal(pos.key, 'x');
  const size = fieldSize();
  assert.ok(size.length >= 2);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/schema_helpers.test.js`
Expected: FAIL with "Cannot find module".

**Step 3: Write minimal implementation**

```js
export function fieldPosition() {
  return { key: 'x', label: 'X', type: 'number', step: 1 };
}

export function fieldPositionY() {
  return { key: 'y', label: 'Y', type: 'number', step: 1 };
}

export function fieldSize() {
  return [
    { key: 'width', label: '宽度', type: 'number', min: 0, step: 1 },
    { key: 'height', label: '高度', type: 'number', min: 0, step: 1 }
  ];
}
```

**Step 4: Run test to verify it passes**

Run: `node --test test/schema_helpers.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add js/ui/schemaHelpers.js test/schema_helpers.test.js
git commit -m "feat: add schema helpers"
```

---

### Task 4: Add defaults() and schema() for Particle

**Files:**
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/objects/Particle.js`
- Test: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/test/particle_schema.test.js`

**Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { Particle } from '../js/objects/Particle.js';

test('Particle provides defaults and schema', () => {
  const d = Particle.defaults();
  assert.equal(d.type, 'particle');
  const s = Particle.schema();
  assert.ok(Array.isArray(s));
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/particle_schema.test.js`
Expected: FAIL with "Particle.defaults is not a function".

**Step 3: Write minimal implementation**

```js
static defaults() {
  return {
    type: 'particle',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    mass: 9.109e-31,
    charge: -1.602e-19,
    radius: 6,
    ignoreGravity: true,
    showTrajectory: true,
    showEnergy: true,
    showVelocity: true,
    velocityDisplayMode: 'vector',
    showForces: false,
    showForceElectric: false,
    showForceMagnetic: false,
    showForceGravity: false,
    showForceNet: true
  };
}

static schema() {
  return [
    { title: '粒子属性', fields: [
      { key: 'mass', label: '质量 (kg)', type: 'number' },
      { key: 'charge', label: '电荷量 (C)', type: 'number' },
      { key: 'vx', label: '速度 vx (m/s)', type: 'expression' },
      { key: 'vy', label: '速度 vy (m/s)', type: 'expression' },
      { key: 'radius', label: '半径 (px)', type: 'number', min: 2, max: 20 }
    ] }
  ];
}
```

**Step 4: Run test to verify it passes**

Run: `node --test test/particle_schema.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add js/objects/Particle.js test/particle_schema.test.js
git commit -m "feat: add particle defaults and schema"
```

---

### Task 5: Add defaults() and schema() for electric field types

**Files:**
- Modify:
  - `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/objects/RectElectricField.js`
  - `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/objects/CircleElectricField.js`
  - `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/objects/SemiCircleElectricField.js`
  - `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/objects/ParallelPlateCapacitor.js`
  - `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/objects/VerticalParallelPlateCapacitor.js`
- Test: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/test/electric_schema.test.js`

**Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { RectElectricField } from '../js/objects/RectElectricField.js';

test('RectElectricField provides defaults and schema', () => {
  assert.equal(RectElectricField.defaults().type, 'electric-field-rect');
  assert.ok(Array.isArray(RectElectricField.schema()));
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/electric_schema.test.js`
Expected: FAIL with "defaults is not a function".

**Step 3: Write minimal implementation**

For each electric class, add `static defaults()` and `static schema()`.
Example for RectElectricField:

```js
static defaults() {
  return { type: 'electric-field-rect', x: 0, y: 0, width: 200, height: 150, strength: 1000, direction: 90 };
}

static schema() {
  return [
    { title: '电场属性', fields: [
      { key: 'x', label: 'X', type: 'number' },
      { key: 'y', label: 'Y', type: 'number' },
      { key: 'width', label: '宽度', type: 'number', min: 1 },
      { key: 'height', label: '高度', type: 'number', min: 1 },
      { key: 'strength', label: '场强 (N/C)', type: 'number' },
      { key: 'direction', label: '方向 (度)', type: 'number' }
    ] }
  ];
}
```

Repeat for other electric classes with their unique fields:
- Circle/Semicircle: `radius` (and `orientation` for semicircle).
- ParallelPlateCapacitor: `width`, `plateDistance`, `polarity`, `sourceType`, `acAmplitude`, `acFrequency`, `acPhase`, `customExpression`.
- VerticalParallelPlateCapacitor: `height`, `plateDistance`, `polarity`, same power fields.

**Step 4: Run test to verify it passes**

Run: `node --test test/electric_schema.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add js/objects/*ElectricField*.js js/objects/ParallelPlateCapacitor.js js/objects/VerticalParallelPlateCapacitor.js test/electric_schema.test.js
git commit -m "feat: add electric field defaults and schemas"
```

---

### Task 6: Add defaults() and schema() for MagneticField

**Files:**
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/objects/MagneticField.js`
- Test: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/test/magnetic_schema.test.js`

**Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { MagneticField } from '../js/objects/MagneticField.js';

test('MagneticField provides defaults and schema', () => {
  assert.equal(MagneticField.defaults().type, 'magnetic-field');
  assert.ok(Array.isArray(MagneticField.schema()));
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/magnetic_schema.test.js`
Expected: FAIL.

**Step 3: Write minimal implementation**

```js
static defaults() {
  return { type: 'magnetic-field', x: 0, y: 0, shape: 'rect', width: 200, height: 150, radius: 90, strength: 0.5 };
}

static schema() {
  return [
    { title: '磁场属性', fields: [
      { key: 'shape', label: '形状', type: 'select', options: [
        { value: 'rect', label: '矩形' },
        { value: 'circle', label: '圆形' },
        { value: 'triangle', label: '三角形' }
      ] },
      { key: 'width', label: '宽度', type: 'number', visibleWhen: obj => obj.shape !== 'circle' },
      { key: 'height', label: '高度', type: 'number', visibleWhen: obj => obj.shape !== 'circle' },
      { key: 'radius', label: '半径', type: 'number', visibleWhen: obj => obj.shape === 'circle' },
      { key: 'strength', label: '磁感应强度 (T)', type: 'number' }
    ] }
  ];
}
```

**Step 4: Run test to verify it passes**

Run: `node --test test/magnetic_schema.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add js/objects/MagneticField.js test/magnetic_schema.test.js
git commit -m "feat: add magnetic field defaults and schema"
```

---

### Task 7: Add defaults() and schema() for device objects

**Files:**
- Modify:
  - `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/objects/ElectronGun.js`
  - `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/objects/ProgrammableEmitter.js`
  - `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/objects/FluorescentScreen.js`
  - `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/objects/DisappearZone.js`
- Test: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/test/device_schema.test.js`

**Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ElectronGun } from '../js/objects/ElectronGun.js';

test('device objects provide defaults and schema', () => {
  assert.equal(ElectronGun.defaults().type, 'electron-gun');
  assert.ok(Array.isArray(ElectronGun.schema()));
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/device_schema.test.js`
Expected: FAIL.

**Step 3: Write minimal implementation**

Example for ElectronGun:

```js
static defaults() {
  return {
    type: 'electron-gun',
    x: 0,
    y: 0,
    direction: 0,
    emissionRate: 1,
    emissionSpeed: 200,
    barrelLength: 25,
    particleType: 'electron',
    particleCharge: -1.602e-19,
    particleMass: 9.109e-31,
    particleRadius: 6,
    ignoreGravity: true,
    showVelocity: false,
    velocityDisplayMode: 'vector',
    showEnergy: false
  };
}

static schema() {
  return [
    { title: '发射器', fields: [
      { key: 'direction', label: '方向 (度)', type: 'number' },
      { key: 'emissionRate', label: '频率 (1/s)', type: 'number', min: 0 },
      { key: 'emissionSpeed', label: '初速度 (px/s)', type: 'number', min: 0 },
      { key: 'barrelLength', label: '枪管长度', type: 'number', min: 0 }
    ] }
  ];
}
```

Add similar defaults/schema for ProgrammableEmitter, FluorescentScreen,
DisappearZone (covering their unique fields).

**Step 4: Run test to verify it passes**

Run: `node --test test/device_schema.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add js/objects/ElectronGun.js js/objects/ProgrammableEmitter.js js/objects/FluorescentScreen.js js/objects/DisappearZone.js test/device_schema.test.js
git commit -m "feat: add device defaults and schemas"
```

---

### Task 8: Update Scene format to use flat objects array

**Files:**
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/core/Scene.js`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/utils/Serializer.js`
- Test: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/test/scene.test.js`

**Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from '../js/core/Scene.js';

test('Scene.serialize emits flat objects array', () => {
  const scene = new Scene();
  const data = scene.serialize();
  assert.ok(Array.isArray(data.objects));
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/scene.test.js`
Expected: FAIL.

**Step 3: Write minimal implementation**

- Add `this.objects = []` to Scene.
- `addObject` pushes into `objects` and assigns `scene`.
- `getAllObjects()` returns `this.objects`.
- `serialize()` returns `{ version, settings, variables, objects }`.
- `loadFromData()` reads `data.objects` and uses registry to instantiate.

Update Serializer.validateSceneData to accept `objects` array and stop
requiring `electricFields/magneticFields/particles`.

**Step 4: Run test to verify it passes**

Run: `node --test test/scene.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add js/core/Scene.js js/utils/Serializer.js test/scene.test.js
git commit -m "feat: switch to flat objects scene format"
```

---

### Task 9: Refactor DragDropManager to use registry.create()

**Files:**
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/interactions/DragDropManager.js`
- Test: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/test/scene.test.js`

**Step 1: Write the failing test**

Add a test to ensure DragDropManager creation uses defaults
(keep minimal by calling registry directly if DOM is hard to test).

**Step 2: Run test to verify it fails**

Run: `node --test test/scene.test.js`
Expected: FAIL.

**Step 3: Write minimal implementation**

Replace the switch-case in `createObject` with:

```js
import { registry } from '../core/registerObjects.js';

const object = registry.create(type, { x, y });
this.scene.addObject(object);
```

Keep resize and drag logic unchanged.

**Step 4: Run test to verify it passes**

Run: `node --test test/scene.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add js/interactions/DragDropManager.js test/scene.test.js
git commit -m "refactor: create objects via registry"
```

---

### Task 10: Add renderer dispatch table and refactor Renderer

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/rendering/ObjectRenderers.js`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/core/Renderer.js`

**Step 1: Write the failing test**

Add a small test to ensure renderer lookup falls back to no-op for
unknown rendererKey.

**Step 2: Run test to verify it fails**

Run: `node --test test/renderer_registry.test.js`
Expected: FAIL.

**Step 3: Write minimal implementation**

- Export a map: `{ electric: drawElectricField, magnetic: drawMagneticField, device: drawDevice, particle: drawParticle }`.
- In `Renderer.renderFields()` iterate all objects and dispatch via
  `registry.get(obj.type).rendererKey`.
- Keep particle rendering in `renderParticles()` but use rendererKey.

**Step 4: Run test to verify it passes**

Run: `node --test test/renderer_registry.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add js/rendering/ObjectRenderers.js js/core/Renderer.js test/renderer_registry.test.js
git commit -m "refactor: renderer dispatch via registry"
```

---

### Task 11: Refactor PhysicsEngine to use physicsHooks

**Files:**
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/core/PhysicsEngine.js`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/core/registerObjects.js`
- Test: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/test/physics_hooks.test.js`

**Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { registry } from '../js/core/registerObjects.js';

test('physics hook runs on update', () => {
  const entry = registry.get('electron-gun');
  assert.ok(entry.physicsHooks?.onUpdate);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/physics_hooks.test.js`
Expected: FAIL.

**Step 3: Write minimal implementation**

- Add `physicsHooks` to registry entries for emitters/screens/disappear.
- In PhysicsEngine.update:
  - loop `scene.objects` and call `onUpdate`.
  - inside particle loop, call `onParticleStep` hooks for zone/screen
    to decide remove/stop.

**Step 4: Run test to verify it passes**

Run: `node --test test/physics_hooks.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add js/core/PhysicsEngine.js js/core/registerObjects.js test/physics_hooks.test.js
git commit -m "refactor: physics hooks via registry"
```

---

### Task 12: Implement SchemaForm (core) + tests

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/ui/SchemaForm.js`
- Test: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/test/schema_form.test.js`

**Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSchema } from '../js/ui/SchemaForm.js';

test('SchemaForm validates required number fields', () => {
  const schema = [{ title: 'A', fields: [{ key: 'x', type: 'number', min: 0 }] }];
  const errors = validateSchema(schema, { x: -1 });
  assert.equal(errors.length, 1);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/schema_form.test.js`
Expected: FAIL.

**Step 3: Write minimal implementation**

Implement pure helpers in SchemaForm for validation and visibility
so they can be tested without DOM:

```js
export function validateSchema(schema, values) {
  const errors = [];
  for (const group of schema) {
    for (const field of group.fields) {
      if (field.visibleWhen && !field.visibleWhen(values)) continue;
      if (field.type === 'number') {
        const value = Number(values[field.key]);
        if (!Number.isFinite(value)) errors.push(field.key);
        if (field.min != null && value < field.min) errors.push(field.key);
      }
    }
  }
  return errors;
}
```

**Step 4: Run test to verify it passes**

Run: `node --test test/schema_form.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add js/ui/SchemaForm.js test/schema_form.test.js
git commit -m "feat: add schema form core validation"
```

---

### Task 13: Integrate SchemaForm into PropertyPanel (full parity)

**Files:**
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/ui/PropertyPanel.js`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/ui/SchemaForm.js`

**Step 1: Write the failing test**

Add a test for expression preview functions in SchemaForm (pure helper)
that uses compileSafeExpression and reports errors.

**Step 2: Run test to verify it fails**

Run: `node --test test/schema_form.test.js`
Expected: FAIL.

**Step 3: Write minimal implementation**

- Add expression parsing helper using compileSafeExpression.
- In PropertyPanel.show, use registry.get(type).schema() to build
  SchemaForm UI, and apply via bind.set or direct assignment.
- Preserve existing preview/error behaviors from current panel.

**Step 4: Run test to verify it passes**

Run: `node --test test/schema_form.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add js/ui/PropertyPanel.js js/ui/SchemaForm.js test/schema_form.test.js
git commit -m "refactor: property panel via schema form"
```

---

### Task 14: Render toolbar from registry

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/ui/Toolbar.js`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/index.html`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/js/main.js`

**Step 1: Write the failing test**

Manual-only (DOM). Skip automated test; add a note in README or plan.

**Step 2: Run test to verify it fails**

Manual: load page, toolbar should be empty.

**Step 3: Write minimal implementation**

- Replace toolbar HTML with a container `<aside id="toolbar"><div id="toolbar-content"></div></aside>`.
- Toolbar.js reads `registry.listByCategory()` and injects tool sections
  with `tool-item` markup and icon SVG strings from registry entries.
- Call new Toolbar() from main.js during init.

**Step 4: Run test to verify it passes**

Manual: page shows all tools with same labels/icons and drag works.

**Step 5: Commit**

```bash
git add js/ui/Toolbar.js index.html js/main.js
git commit -m "feat: build toolbar from registry"
```

---

### Task 15: Update docs for breaking format

**Files:**
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/README.md`

**Step 1: Write the failing test**

N/A (docs-only).

**Step 2: Run test to verify it fails**

N/A.

**Step 3: Write minimal implementation**

Add a section noting the new scene format is incompatible with old
localStorage/exports, and advise re-exporting scenes after upgrade.

**Step 4: Run test to verify it passes**

N/A.

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: note scene format breaking change"
```

---

### Task 16: Manual smoke test checklist

**Files:**
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/object-registry-schema/TESTING-GUIDE.md`

**Step 1: Write the failing test**

N/A.

**Step 2: Run test to verify it fails**

N/A.

**Step 3: Write minimal implementation**

Add a short manual checklist for:
- Drag/drop each tool.
- Edit properties with expression preview.
- Save/export/import with new format.
- Play/pause and verify emitter/screen behaviors.

**Step 4: Run test to verify it passes**

Manual run before merge.

**Step 5: Commit**

```bash
git add TESTING-GUIDE.md
git commit -m "docs: add registry refactor smoke checklist"
```

---

Plan complete. Execute in order, keeping changes small and validated.
