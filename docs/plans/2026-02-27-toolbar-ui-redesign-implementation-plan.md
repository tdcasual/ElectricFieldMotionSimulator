# Toolbar Visual Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the component library (toolbar) visual style to a clean engineering panel aesthetic with robust light/dark theme parity and clearer armed-tool feedback.

**Architecture:** Keep runtime/physics untouched and preserve drag-drop contracts (`.tool-item`, `data-type`). Implement redesign through semantic CSS tokens, toolbar markup semantics, and scoped style updates. Keep armed state source in `DragDropManager` and style `.tool-item.active` as the canonical armed state.

**Tech Stack:** Vue 3, Pinia, CSS variables, Vitest, Node test runner

---

### Task 1: Define Toolbar Theme Tokens (Light + Dark)

**Files:**
- Modify: `styles/theme.css`
- Test: `frontend/test/toolbar-panel.test.ts`

**Step 1: Write failing test**
- Add assertions for semantic toolbar class hooks rendered by component (group header + item label wrappers) so style tokens can target stable structure.

**Step 2: Run test to verify failure**
- Run: `npm run test:frontend -- toolbar-panel.test.ts`
- Expected: FAIL due to missing semantic hooks.

**Step 3: Minimal implementation**
- Add semantic class wrappers in `ToolbarPanel.vue` without changing events/data contracts.

**Step 4: Verify pass**
- Run: `npm run test:frontend -- toolbar-panel.test.ts`
- Expected: PASS.

### Task 2: Rebuild Toolbar Panel Visual Hierarchy

**Files:**
- Modify: `styles/main.css`
- Modify: `frontend/src/components/ToolbarPanel.vue`
- Modify: `frontend/src/App.vue` (toolbar title area hook only if needed)
- Test: `frontend/test/app-shell.test.ts`

**Step 1: Write failing test**
- Add test(s) asserting presence of new structural classes required by redesigned hierarchy.

**Step 2: Run test to verify failure**
- Run: `npm run test:frontend -- toolbar-panel.test.ts app-shell.test.ts`
- Expected: FAIL on missing classes/structure.

**Step 3: Minimal implementation**
- Update toolbar markup with stable semantic hooks.
- Restyle toolbar panel/group/card/focus/active/dragging states.
- Keep mobile breakpoints functional.

**Step 4: Verify pass**
- Run: `npm run test:frontend -- toolbar-panel.test.ts app-shell.test.ts`
- Expected: PASS.

### Task 3: Preserve Armed State and Improve Accessibility Surface

**Files:**
- Modify: `js/interactions/DragDropManager.js`
- Test: `test/dragdrop_manager_dom.test.js`

**Step 1: Write failing test**
- Add DOM-level assertion that arming/disarming updates accessibility markers on the active tool element.

**Step 2: Run test to verify failure**
- Run: `npm test -- test/dragdrop_manager_dom.test.js`
- Expected: FAIL because aria marker is not updated.

**Step 3: Minimal implementation**
- In `armTool`/`disarmTool`/`dispose`, synchronize `aria-pressed` with `.active` class.

**Step 4: Verify pass**
- Run: `npm test -- test/dragdrop_manager_dom.test.js`
- Expected: PASS.

### Task 4: Full Verification

**Files:**
- Modify: none (verification only)

**Step 1: Run frontend suite**
- Run: `npm run test:frontend`
- Expected: all tests pass.

**Step 2: Run backend DOM + registry safety tests**
- Run: `npm test -- test/dragdrop_manager_dom.test.js test/object_registry.test.js`
- Expected: all tests pass.

