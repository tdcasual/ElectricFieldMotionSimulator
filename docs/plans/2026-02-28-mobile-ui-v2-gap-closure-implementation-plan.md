# Mobile UI V2 Gap Closure Implementation Plan

Status: Completed on 2026-02-28

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the remaining Mobile UI V2 gaps on top of current mainline by adding edit-mode pinch zoom parity, geometry interaction overlay feedback, and focused phone regression coverage.

**Architecture:** Keep the existing phone shell (`PhoneBottomNav` + sheet system) unchanged. Extend interaction behavior incrementally in `DragDropManager` and expose geometry interaction feedback to Vue UI through existing runtime/store sync paths. Avoid broad state rewrites (`phoneInspectorLevel`, `phonePlayFabVisible`) unless a gap requires them. Use TDD for each behavior change and preserve current desktop/tablet behavior.

**Tech Stack:** Vue 3 + TypeScript, legacy JS runtime bridge, Node test runner, Vitest, Playwright.

---

### Task 1: Enable pinch zoom in edit mode (without breaking object manipulation priority)

**Files:**
- Modify: `js/interactions/DragDropManager.js`
- Test: `test/dragdrop_manager_dom.test.js`
- Test: `frontend/e2e/touch-core-path.spec.ts`

**Step 1: Write failing unit tests (RED)**
- Add a test asserting two-finger pinch changes zoom when `scene.settings.mode` is not `demo`.
- Add a test asserting single-touch object drag priority remains unchanged in edit mode.

**Step 2: Run focused Node tests and confirm failure**
- Run: `npm test -- test/dragdrop_manager_dom.test.js`
- Expected: new edit-mode pinch test fails.

**Step 3: Implement minimal behavior**
- In `DragDropManager`, relax pinch gating so touch pinch can run in edit mode while preserving:
  - single-pointer drag/resize precedence
  - interaction lock behavior in `hostMode=view`
  - existing demo-mode semantics (gravity zeroing, zoom bounds).

**Step 4: Re-run focused tests (GREEN)**
- Run: `npm test -- test/dragdrop_manager_dom.test.js`
- Expected: pass.

**Step 5: Add and run E2E regression**
- Add a phone E2E case in `frontend/e2e/touch-core-path.spec.ts` that pinch in edit mode changes zoom and does not trigger stale tap-chain/property-open side effects.
- Run: `npm run test:e2e -- frontend/e2e/touch-core-path.spec.ts --project=phone-chromium --grep "edit mode pinch"`
- Expected: pass.

---

### Task 2: Add geometry interaction overlay badge (`real/display/scale`) during handle drag

**Files:**
- Create: `frontend/src/components/GeometryOverlayBadge.vue`
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/runtime/simulatorRuntime.ts`
- Modify: `frontend/src/stores/simulatorStore.ts`
- Modify: `styles/main.css`
- Test: `frontend/test/app-shell.test.ts`
- Test: `frontend/test/simulator-store.test.ts`

**Step 1: Write failing frontend tests (RED)**
- Add store/app-shell tests asserting:
  - overlay appears only while geometry direct manipulation is active
  - overlay shows `real/display/scale` values for current geometry key
  - overlay hides when drag ends/cancels.

**Step 2: Run focused frontend tests and confirm failure**
- Run: `npm run test:frontend -- frontend/test/app-shell.test.ts frontend/test/simulator-store.test.ts`
- Expected: fail for missing overlay state/render.

**Step 3: Implement minimal data path**
- Add transient geometry interaction state to store (read-only for UI rendering).
- Surface interaction payload from runtime while resize drag is active and clear it on drag end/cancel.
- Render `GeometryOverlayBadge` near canvas in `App.vue` only for phone layout.
- Style overlay for safe-area and non-blocking pointer behavior.

**Step 4: Re-run focused tests (GREEN)**
- Run: `npm run test:frontend -- frontend/test/app-shell.test.ts frontend/test/simulator-store.test.ts`
- Expected: pass.

---

### Task 3: Add “recent edited geometry fields” memory for phone selected sheet

**Files:**
- Modify: `frontend/src/stores/simulatorStore.ts`
- Modify: `frontend/src/modes/phoneGeometry.ts`
- Modify: `frontend/src/components/PhoneSelectedSheet.vue`
- Test: `frontend/test/phone-selected-sheet.test.ts`
- Test: `frontend/test/use-app-ui-state.test.ts`

**Step 1: Write failing tests (RED)**
- Add tests asserting:
  - most recently edited geometry fields are pinned to top of phone selected list
  - memory is scoped by object type/key and reset when selection changes to incompatible geometry.

**Step 2: Run focused tests and confirm failure**
- Run: `npm run test:frontend -- frontend/test/phone-selected-sheet.test.ts frontend/test/use-app-ui-state.test.ts`
- Expected: fail due to missing ordering memory.

**Step 3: Implement minimal memory model**
- Track recent geometry keys in store (small bounded list).
- Update memory on `update-phone-selected-value`.
- Apply ordering in `buildPhoneGeometryRows` (recent-first, stable fallback).

**Step 4: Re-run focused tests (GREEN)**
- Run: `npm run test:frontend -- frontend/test/phone-selected-sheet.test.ts frontend/test/use-app-ui-state.test.ts`
- Expected: pass.

---

### Task 4: Final phone regression and docs alignment

**Files:**
- Modify: `frontend/e2e/touch-core-path.spec.ts`
- Modify: `docs/plans/2026-02-27-mobile-ui-interaction-design-v2.md` (status sync)
- Modify: `CHANGELOG.md` (if behavior/user-visible)

**Step 1: Expand E2E assertions**
- Ensure touch-core path includes:
  - edit-mode pinch zoom
  - geometry overlay visibility lifecycle
  - recent-field ordering behavior (if UI-visible).

**Step 2: Run full verification**
- Run: `npm run quality:all`
- Expected: lint + typecheck + node + frontend + e2e all pass.

**Step 3: Update docs with completion status**
- Mark completed V2 gap items and any deferred optional items (teaching preset shortcut remains optional).

---

### Definition of Done

1. Edit mode supports pinch zoom with no regression to single-touch drag/resize behavior.
2. During geometry handle drag on phone, overlay shows live `real/display/scale` and clears correctly.
3. Phone selected quick geometry list supports recent-edited ordering with deterministic fallback.
4. `npm run quality:all` passes on current mainline.
5. V2 design doc status reflects actual completion/defer decisions.

---

## Execution Notes (2026-02-28)

1. Task 1 completed:
   - Added edit-mode pinch RED tests in `test/dragdrop_manager_dom.test.js` and `frontend/e2e/touch-core-path.spec.ts`.
   - Implemented touch pinch gate relaxation in `DragDropManager` with host `view` lock guard and demo-only gravity side effect.
2. Task 2 completed:
   - Added `GeometryOverlayBadge.vue`.
   - Wired resize interaction payload (`real/display/scale`) from interaction runtime -> snapshot -> store -> `App.vue` phone render.
   - Added drag lifecycle cleanup on pointer/mouse end and cancel paths.
3. Task 3 completed:
   - Added recent geometry source-key memory in store.
   - Updated phone quick-edit action path to record edits and rebuild payload.
   - Added recent-first ordering in `buildPhoneGeometryRows`.
4. Verification completed:
   - `npm run quality:all` passed (lint/typecheck/node/frontend/e2e).
