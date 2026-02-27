# Geometry Real/Display Dual-Semantics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split geometry into stable real values and zoom-dependent display values, with editable display values mapped to per-object temporary scale.

**Architecture:** Introduce a shared geometry scaling helper that owns runtime `real`/`objectScale` state and conversion math. Demo zoom updates global scale only, while runtime property handling exposes paired real/display fields and applies writes through helper APIs.

**Tech Stack:** Vanilla JS modules (`js/*`), Vue runtime (`frontend/src/runtime`), Node test runner (`node --test`), Vitest (`frontend/test`).

---

### Task 1: Add failing helper tests

**Files:**
- Modify: `test/demo_mode.test.js`
- Create: `test/geometry_scaling.test.js`

**Step 1: Write failing tests for geometry helper semantics**
- Expect real geometry to stay stable when scene scale changes.
- Expect display edit to change only object scale.

**Step 2: Run tests to verify RED**
Run: `node --test test/geometry_scaling.test.js test/demo_mode.test.js`
Expected: helper-related failures.

### Task 2: Implement geometry scaling helper

**Files:**
- Create: `js/modes/GeometryScaling.js`

**Step 1: Implement minimal APIs**
- geometry key set
- scene/object scale getters
- initialize/sync helpers
- set real / set display logic

**Step 2: Run tests to verify GREEN for helper tests**
Run: `node --test test/geometry_scaling.test.js`
Expected: PASS.

### Task 3: Integrate demo creation and zoom

**Files:**
- Modify: `js/interactions/DragDropManager.js`
- Modify: `js/modes/DemoMode.js`

**Step 1: Initialize geometry state on object creation in demo mode**

**Step 2: Make zoom preserve real geometry and resync display geometry**

**Step 3: Verify with tests**
Run: `node --test test/demo_mode.test.js test/geometry_scaling.test.js`
Expected: PASS.

### Task 4: Integrate runtime property payload/apply

**Files:**
- Modify: `frontend/src/runtime/simulatorRuntime.ts`
- Modify: `frontend/test/simulator-runtime.test.ts`

**Step 1: Build paired real/display schema fields for geometry dimensions**

**Step 2: Apply writes via helper APIs**
- `real` input writes real geometry
- `display` input updates object scale only

**Step 3: Verify with tests**
Run: `npm run test:frontend -- frontend/test/simulator-runtime.test.ts`
Expected: PASS.

### Task 5: Regression verification

**Files:**
- Modify: tests only if assertions need semantic update

**Step 1: Run focused JS and frontend suites**
Run:
- `node --test test/geometry_scaling.test.js test/demo_mode.test.js test/magnetic_schema.test.js test/schema_form.test.js`
- `npm run test:frontend -- frontend/test/simulator-runtime.test.ts frontend/test/property-drawer.test.ts`

**Step 2: Fix regressions minimally and re-run**

**Step 3: Final verification**
- Re-run the same commands and report evidence.
