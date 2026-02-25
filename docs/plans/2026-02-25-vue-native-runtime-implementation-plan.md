# Vue Native Runtime Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate app orchestration and UI behavior to a Vue-native runtime while reusing validated simulation engine modules.

**Architecture:** Add a dedicated `SimulatorRuntime` service behind a Pinia store, move UI actions to Vue components, and keep legacy engine modules as domain/render adapters. Remove root-wrapper layout regression by restoring `#app` as the direct grid root.

**Tech Stack:** Vue 3, Pinia, TypeScript, existing JS engine modules, Vitest, Playwright.

---

### Task 1: Add failing UI-contract tests
- Update `frontend/test/app-shell.test.ts` for Vue-native root layout semantics.
- Update `frontend/test/toolbar-panel.test.ts` for registry-driven toolbar rendering.
- Update `frontend/test/property-drawer.test.ts` for schema-driven fields and apply payload.

### Task 2: Build runtime and state layer
- Create `frontend/src/runtime/simulatorRuntime.ts`.
- Create `frontend/src/stores/simulatorStore.ts`.
- Expose runtime APIs for mount/unmount/render/loop/object creation/property apply/io/theme.

### Task 3: Refactor legacy interaction coupling
- Modify `js/interactions/DragDropManager.js` to support injected `appAdapter` and stop relying on global `window.app` when adapter is provided.

### Task 4: Vue component migration
- Refactor `frontend/src/App.vue` to use `simulatorStore` actions and reactive state.
- Refactor `frontend/src/components/ToolbarPanel.vue` to props-driven registry rendering.
- Refactor `frontend/src/components/CanvasViewport.vue` to pure canvas host.
- Refactor `frontend/src/components/PropertyDrawer.vue` to schema-based editor.

### Task 5: Entry and docs alignment
- Switch mount container in `index.html` to `#root` and mount from `frontend/src/main.ts`.
- Keep `frontend/index.html` aligned for Vite root.
- Update `test/main_entry_switch.test.js`, `README.md`, `QUICKSTART.md`.

### Task 6: Verification
- Run targeted tests first.
- Run `npm run test:frontend`.
- Run `npm run quality:all`.
- Run `npm run build:frontend`.
