# Responsive and Touch Experience Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the first production-ready responsive and touch interaction upgrade for the simulator, including phone/tablet layout adaptation, touch object action completion, and demo pinch zoom.

**Architecture:** Keep one simulation runtime and one data model, then add a UI-shell state layer plus input adaptation improvements. Implement behavior incrementally under TDD: add failing tests first, then minimal code to pass, then refactor. Preserve existing desktop behavior while adding phone/tablet compatibility paths.

**Tech Stack:** Vue 3 + Pinia + TypeScript, existing JS engine/runtime (`SimulatorRuntime`, `DragDropManager`), Vitest + node:test + Playwright.

---

### Task 1: Add layout mode state contract (RED)

**Files:**
- Modify: `frontend/test/simulator-store.test.ts`
- Modify: `frontend/test/app-shell.test.ts`

**Step 1: Write the failing store test**

Add tests expecting a new `layoutMode` state with values `desktop|tablet|phone` and an action `setLayoutMode`.

**Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- frontend/test/simulator-store.test.ts`
Expected: FAIL because `layoutMode`/`setLayoutMode` do not exist.

**Step 3: Write a failing app-shell test for class mapping**

Add a test expecting `#app` to receive `layout-phone` class after setting store mode.

**Step 4: Run test to verify it fails**

Run: `npm run test:frontend -- frontend/test/app-shell.test.ts`
Expected: FAIL on missing class.

**Step 5: Commit**

```bash
git add frontend/test/simulator-store.test.ts frontend/test/app-shell.test.ts
git commit -m "test: add failing layout mode state and shell class expectations"
```

### Task 2: Implement layout mode state and shell class (GREEN)

**Files:**
- Modify: `frontend/src/stores/simulatorStore.ts`
- Modify: `frontend/src/App.vue`

**Step 1: Implement minimal store state/action**

Add `layoutMode` ref defaulting to `desktop`; add `setLayoutMode(mode)` with value guards.

**Step 2: Bind shell classes in App**

Bind `layout-desktop/layout-tablet/layout-phone` classes on `#app` from store state.

**Step 3: Re-run layout tests**

Run: `npm run test:frontend -- frontend/test/simulator-store.test.ts frontend/test/app-shell.test.ts`
Expected: PASS.

**Step 4: Commit**

```bash
git add frontend/src/stores/simulatorStore.ts frontend/src/App.vue
git commit -m "feat: add layout mode state and shell mode classes"
```

### Task 3: Add viewport-driven layout mode sync (RED->GREEN)

**Files:**
- Modify: `frontend/test/app-shell.test.ts`
- Modify: `frontend/src/App.vue`

**Step 1: Write failing test for resize behavior**

Add a test mocking window width transitions and expecting store mode updates on mount.

**Step 2: Run failing test**

Run: `npm run test:frontend -- frontend/test/app-shell.test.ts`
Expected: FAIL (no resize listener).

**Step 3: Implement minimal resize sync**

In `App.vue`, on mount calculate mode from viewport and register `resize` listener; cleanup on unmount.

**Step 4: Re-run app-shell tests**

Run: `npm run test:frontend -- frontend/test/app-shell.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/App.vue frontend/test/app-shell.test.ts
git commit -m "feat: sync layout mode from viewport width"
```

### Task 4: Add touch object action bar component (RED)

**Files:**
- Create: `frontend/src/components/ObjectActionBar.vue`
- Create: `frontend/test/object-action-bar.test.ts`
- Modify: `frontend/test/app-shell.test.ts`

**Step 1: Write failing component tests**

Add tests requiring buttons: `属性`, `复制`, `删除` and emitted events `open-properties`, `duplicate`, `delete`.

**Step 2: Run failing tests**

Run: `npm run test:frontend -- frontend/test/object-action-bar.test.ts`
Expected: FAIL (component missing).

**Step 3: Add failing app visibility test**

Add app-shell test expecting action bar render gate based on selected object and touch layout.

**Step 4: Run failing app test**

Run: `npm run test:frontend -- frontend/test/app-shell.test.ts`
Expected: FAIL on missing integration.

**Step 5: Commit**

```bash
git add frontend/test/object-action-bar.test.ts frontend/test/app-shell.test.ts
# component file may not exist yet for this commit if strictly red-only; keep as test-only commit
# if runner requires stub, create minimal failing stub
```

### Task 5: Implement touch object action bar integration (GREEN)

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/stores/simulatorStore.ts`
- Create/Modify: `frontend/src/components/ObjectActionBar.vue`
- Modify: `styles/main.css`
- Modify: `styles/components.css`

**Step 1: Implement component UI and emits**

Create fixed action bar UI with three buttons and accessible labels.

**Step 2: Integrate in App**

Show action bar when authoring mode + selected object + (`layout-phone` or coarse pointer). Wire emits to existing store actions.

**Step 3: Add coarse pointer state in App**

Detect coarse pointer on mount and update reactive flag.

**Step 4: Add style rules**

Ensure touch target >=44px and avoid overlap with footer.

**Step 5: Re-run tests**

Run: `npm run test:frontend -- frontend/test/object-action-bar.test.ts frontend/test/app-shell.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add frontend/src/components/ObjectActionBar.vue frontend/src/App.vue frontend/src/stores/simulatorStore.ts styles/main.css styles/components.css frontend/test/object-action-bar.test.ts frontend/test/app-shell.test.ts
git commit -m "feat: add touch object action bar for properties duplicate delete"
```

### Task 6: Add demo pinch zoom tests (RED)

**Files:**
- Modify: `test/dragdrop_helpers.test.js`

**Step 1: Write failing pinch test helper coverage**

Add unit tests for new pinch math helper(s), including clamp and anchor semantics in demo mode.

**Step 2: Run test and verify failure**

Run: `npm test -- test/dragdrop_helpers.test.js`
Expected: FAIL due to missing helper exports/behavior.

**Step 3: Commit**

```bash
git add test/dragdrop_helpers.test.js
git commit -m "test: add failing demo pinch zoom helper coverage"
```

### Task 7: Implement demo pinch zoom in drag interaction (GREEN)

**Files:**
- Modify: `js/interactions/DragDropManager.js`
- Modify: `test/dragdrop_helpers.test.js`

**Step 1: Implement pinch state + handlers**

Track dual-touch points in demo mode; convert midpoint to world anchor; apply zoom with clamped limits.

**Step 2: Export helper utilities for deterministic unit tests**

Add small pure helper(s) for pinch distance/zoom calculation and test directly.

**Step 3: Ensure drag/pan and pinch precedence rules**

When pinch active, suspend single-touch drag behavior.

**Step 4: Re-run targeted tests**

Run: `npm test -- test/dragdrop_helpers.test.js test/demo_mode.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add js/interactions/DragDropManager.js test/dragdrop_helpers.test.js
git commit -m "feat: support two-finger demo pinch zoom"
```

### Task 8: Responsive CSS adjustments for phone/tablet shell

**Files:**
- Modify: `styles/main.css`
- Modify: `styles/components.css`
- Modify: `frontend/src/App.vue`

**Step 1: Write failing app-shell assertions where possible**

Add tests for shell mode class-specific behavior and key element visibility toggles.

**Step 2: Implement minimal CSS improvements**

- Reduce header crowding in phone mode.
- Prevent preset section overflow in compact rail.
- Keep control bar and canvas usable under 390px.

**Step 3: Re-run frontend tests**

Run: `npm run test:frontend`
Expected: PASS.

**Step 4: Commit**

```bash
git add styles/main.css styles/components.css frontend/src/App.vue frontend/test/app-shell.test.ts
git commit -m "feat: improve phone and tablet responsive shell behavior"
```

### Task 9: Add touch E2E project coverage

**Files:**
- Modify: `frontend/playwright.config.ts`
- Create: `frontend/e2e/touch-core-path.spec.ts`

**Step 1: Write failing touch E2E spec**

Add iPhone/iPad project coverage for tap-place and long-press property open.

**Step 2: Run touch E2E and capture failures**

Run: `npm run test:e2e -- frontend/e2e/touch-core-path.spec.ts`
Expected: FAIL initially until behavior is fully wired.

**Step 3: Adjust implementation until pass**

Finalize selectors and interaction flow.

**Step 4: Re-run full E2E subset**

Run: `npm run test:e2e -- frontend/e2e/core-path.spec.ts frontend/e2e/touch-core-path.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/playwright.config.ts frontend/e2e/touch-core-path.spec.ts
git commit -m "test: add tablet and phone touch e2e coverage"
```

### Task 10: Full verification and documentation updates

**Files:**
- Modify: `docs/plans/2026-02-27-responsive-touch-design.md` (if implementation deviates)
- Optionally modify: `CHANGELOG.md`

**Step 1: Run full verification**

```bash
npm test
npm run test:frontend
npm run test:e2e -- frontend/e2e/core-path.spec.ts frontend/e2e/touch-core-path.spec.ts
```

Expected: all PASS.

**Step 2: Update docs for shipped behavior**

Document any accepted deviations and interaction details.

**Step 3: Final commit**

```bash
git add docs/plans/2026-02-27-responsive-touch-design.md CHANGELOG.md
git commit -m "docs: record responsive and touch implementation details"
```
