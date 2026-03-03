# Geometry V2 Hard-Cut Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove legacy geometry compatibility and migrate runtime to a V2-only geometry model (`polygon | circle`) with lower code complexity and fewer branches.

**Architecture:** Introduce one geometry contract shared by render/interaction/hit-test/serialization. Delete legacy `shape/width/height` compatibility paths for field objects and reject pre-V2 scenes at load/validation time.

**Tech Stack:** Vanilla JS engine modules, Vue 3 + Pinia frontend, Node test runner, Vitest, Playwright.

## Current Status

- Task 1: Completed
- Task 2: Completed
- Task 3: Completed
- Task 4: Completed
- Task 5: Pending
- Task 6: Completed
- Task 7: In Progress

---

### Task 1: Lock V2 Scene Gate (Serializer + Scene loading)

**Files:**
- Modify: `js/utils/Serializer.js`
- Modify: `js/core/Scene.js`
- Test: `test/scene.test.js`

**Step 1: Write the failing test**

Add tests asserting:
- `Serializer.validateSceneData` rejects scene `version !== '2.0'`
- `Scene.loadFromData` throws/rejects invalid version payload

**Step 2: Run test to verify it fails**

Run: `npm test -- test/scene.test.js`  
Expected: FAIL because current validator accepts legacy versions.

**Step 3: Write minimal implementation**

- Remove legacy object migration in `Serializer.collectLegacyObjects` usage.
- Enforce strict version check in validator (`version === '2.0'` only).
- Make `Scene.loadFromData` guard against non-V2 payloads.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/scene.test.js`  
Expected: PASS.

**Step 5: Commit**

```bash
git add js/utils/Serializer.js js/core/Scene.js test/scene.test.js
git commit -m "refactor: enforce v2-only scene format"
```

### Task 2: Introduce Unified Geometry Contract Tests

**Files:**
- Create: `test/geometry_kernel_contract.test.js`
- Modify: `test/dragdrop_helpers.test.js`

**Step 1: Write the failing test**

Define contract tests for:
- `polygon` point hit test
- `circle` point hit test
- boundary segments extraction for both kinds
- bounds computation and vertex-handle generation

**Step 2: Run test to verify it fails**

Run: `npm test -- test/geometry_kernel_contract.test.js test/dragdrop_helpers.test.js`  
Expected: FAIL because unified API does not exist yet.

**Step 3: Write minimal implementation**

- Implement/complete `js/geometry/GeometryKernel.js` with the above primitives.
- Adapt helper usage sites to call kernel methods.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/geometry_kernel_contract.test.js test/dragdrop_helpers.test.js`  
Expected: PASS.

**Step 5: Commit**

```bash
git add js/geometry/GeometryKernel.js test/geometry_kernel_contract.test.js test/dragdrop_helpers.test.js
git commit -m "feat: add unified geometry kernel contract"
```

### Task 3: Hard-Cut Field Object Models to Geometry V2

**Files:**
- Modify: `js/objects/MagneticField.js`
- Modify: `js/objects/RectElectricField.js`
- Modify: `js/core/registerObjects.js`
- Test: `test/magnetic_schema.test.js`
- Test: `test/electric_schema.test.js`

**Step 1: Write the failing test**

Add assertions that:
- field objects serialize `geometry` (kind + payload)
- no runtime dependence on legacy `shape/width/height` branches
- magnetic presets create polygon/circle geometry directly

**Step 2: Run test to verify it fails**

Run: `npm test -- test/magnetic_schema.test.js test/electric_schema.test.js`  
Expected: FAIL due old schema/model fields.

**Step 3: Write minimal implementation**

- Move field geometry to explicit `geometry` object:
  - polygon: `geometry.vertices` (local points)
  - circle: `geometry.radius`
- Remove legacy shape switch behavior from object methods.
- Register magnetic tool variants as different defaults over same V2 model.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/magnetic_schema.test.js test/electric_schema.test.js`  
Expected: PASS.

**Step 5: Commit**

```bash
git add js/objects/MagneticField.js js/objects/RectElectricField.js js/core/registerObjects.js test/magnetic_schema.test.js test/electric_schema.test.js
git commit -m "refactor: migrate field objects to v2 geometry model"
```

### Task 4: Replace Drag Geometry Paths with One Interaction Flow

**Files:**
- Modify: `js/interactions/DragDropManager.js`
- Test: `test/dragdrop_manager_dom.test.js`

**Step 1: Write the failing test**

Add/adjust tests for:
- polygon vertex drag path (magnetic + electric)
- circle radius drag path
- move path unaffected when no handle hit
- no legacy resize mode split by electric/magnetic type

**Step 2: Run test to verify it fails**

Run: `npm test -- test/dragdrop_manager_dom.test.js`  
Expected: FAIL because legacy branch methods still used.

**Step 3: Write minimal implementation**

- Collapse `resizeMagneticField` + `resizeElectricField` into kernel-backed handle drag flow.
- Use generic `getGeometryHandles` and `applyGeometryHandleDrag`.
- Remove unreachable legacy branch code.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/dragdrop_manager_dom.test.js`  
Expected: PASS.

**Step 5: Commit**

```bash
git add js/interactions/DragDropManager.js test/dragdrop_manager_dom.test.js
git commit -m "refactor: unify geometry dragging interactions"
```

### Task 5: Replace Renderer Shape Branches with Geometry Rendering

**Files:**
- Modify: `js/core/Renderer.js`
- Test: `test/magnetic_field_rendering.test.js`
- Test: `test/particle_centroid_hint_rendering.test.js`

**Step 1: Write the failing test**

Add assertions that render path dispatches by `geometry.kind` only and still draws:
- selection outlines
- handles
- center marker behavior

**Step 2: Run test to verify it fails**

Run: `npm test -- test/magnetic_field_rendering.test.js test/particle_centroid_hint_rendering.test.js`  
Expected: FAIL on legacy shape assumptions.

**Step 3: Write minimal implementation**

- Render polygon and circle via one geometry reader.
- Remove `shape === 'triangle'/'rect'` branch chains.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/magnetic_field_rendering.test.js test/particle_centroid_hint_rendering.test.js`  
Expected: PASS.

**Step 5: Commit**

```bash
git add js/core/Renderer.js test/magnetic_field_rendering.test.js test/particle_centroid_hint_rendering.test.js
git commit -m "refactor: render fields via geometry kind"
```

### Task 6: Remove UI Legacy Controls and Final Regression

**Files:**
- Modify: `frontend/src/components/SceneSettingsControls.vue`
- Modify: `frontend/src/stores/simulatorStore.ts`
- Modify: `frontend/src/modes/useAppActions.ts`
- Test: `frontend/test/scene-settings-controls.test.ts`
- Test: `frontend/test/simulator-store.test.ts`

**Step 1: Write the failing test**

Define the expected post-hard-cut UI:
- remove legacy geometry compatibility controls
- keep scene controls functional

**Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- frontend/test/scene-settings-controls.test.ts frontend/test/simulator-store.test.ts`  
Expected: FAIL due old toggle/state expectations.

**Step 3: Write minimal implementation**

- Remove now-unneeded compatibility flags and wiring.
- Keep only controls that map to V2 runtime behavior.

**Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- frontend/test/scene-settings-controls.test.ts frontend/test/simulator-store.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/SceneSettingsControls.vue frontend/src/stores/simulatorStore.ts frontend/src/modes/useAppActions.ts frontend/test/scene-settings-controls.test.ts frontend/test/simulator-store.test.ts
git commit -m "refactor: remove legacy geometry compatibility ui"
```

### Task 7: Full Verification + Dead Code Cleanup

**Files:**
- Modify: `js/**/*` and `frontend/src/**/*` (only dead/unreferenced code)
- Test: full suites

**Step 1: Remove dead code introduced by hard-cut**

Delete unused helpers, obsolete branches, stale imports.

**Step 2: Run full verification**

Run:
- `npm test`
- `npm run test:frontend`
- `npm run typecheck:frontend`
- `npm run lint:frontend`
- `npm run test:e2e -- frontend/e2e/touch-core-path.spec.ts --project=phone-chromium`

Expected: all pass.

**Step 3: Final commit**

```bash
git add -A
git commit -m "refactor: hard-cut geometry v2 and remove legacy compatibility"
```
