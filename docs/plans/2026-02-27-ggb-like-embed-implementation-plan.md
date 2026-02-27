# GGB-like Embed Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver phase-1 embedding foundation: iframe-friendly viewer mode, URL/inline scene loading, host event bridge, and deploy-ready `viewer.html`/`embed.js` artifacts.

**Architecture:** Add a small embed layer (`embedConfig` + `sceneSourceResolver`) above existing simulator runtime/store, then wire bootstrap in `main.ts` and expose host-facing behavior via `postMessage` and static `embed.js`. Keep engine core unchanged and reuse `Scene` schema validation.

**Tech Stack:** Vue 3, Pinia, Vite, TypeScript, Vitest, Playwright.

---

### Task 1: Embed config parser (URL + alias mapping)

**Files:**
- Create: `frontend/src/embed/embedConfig.ts`
- Test: `frontend/test/embed-config.test.ts`

**Step 1: Write the failing test**
- Add tests for:
  - canonical fields (`mode`, `sceneUrl`, `sceneData`, `autoplay`, `toolbar`)
  - alias fields (`scene`, `filename`, `id`, `material_id`, `mid`, `m`)
  - precedence (`sceneData > sceneUrl > materialId`)
  - safe defaults (`mode=edit`, toolbar true in edit / false in view)

**Step 2: Run test to verify it fails**
- Run: `npm run test:frontend -- frontend/test/embed-config.test.ts`
- Expected: FAIL because module does not exist yet.

**Step 3: Write minimal implementation**
- Implement parser and normalizer in `embedConfig.ts`.

**Step 4: Run test to verify it passes**
- Run: `npm run test:frontend -- frontend/test/embed-config.test.ts`
- Expected: PASS.

### Task 2: Scene source resolver

**Files:**
- Create: `frontend/src/embed/sceneSourceResolver.ts`
- Modify: `frontend/src/io/sceneIO.ts` (reuse validator only if needed)
- Test: `frontend/test/scene-source-resolver.test.ts`

**Step 1: Write the failing test**
- Add tests for:
  - inline JSON scene success
  - remote URL fetch success
  - fetch/network failure
  - schema validation failure

**Step 2: Run test to verify it fails**
- Run: `npm run test:frontend -- frontend/test/scene-source-resolver.test.ts`
- Expected: FAIL because resolver is not implemented.

**Step 3: Write minimal implementation**
- Implement resolver with typed error codes and validator integration.

**Step 4: Run test to verify it passes**
- Run: `npm run test:frontend -- frontend/test/scene-source-resolver.test.ts`
- Expected: PASS.

### Task 3: Runtime/store host hooks

**Files:**
- Modify: `frontend/src/runtime/simulatorRuntime.ts`
- Modify: `frontend/src/stores/simulatorStore.ts`
- Test: `frontend/test/simulator-store.test.ts`

**Step 1: Write the failing test**
- Add tests for:
  - store host mode switch (`edit/view`)
  - loading scene payload via store API updates object count
  - autoplay toggle in host bootstrap path

**Step 2: Run test to verify it fails**
- Run: `npm run test:frontend -- frontend/test/simulator-store.test.ts`
- Expected: FAIL because host APIs are missing.

**Step 3: Write minimal implementation**
- Add runtime method to load raw scene payload.
- Add store host mode state + bootstrap APIs.

**Step 4: Run test to verify it passes**
- Run: `npm run test:frontend -- frontend/test/simulator-store.test.ts`
- Expected: PASS.

### Task 4: Viewer-mode UI and app bootstrap wiring

**Files:**
- Modify: `frontend/src/main.ts`
- Modify: `frontend/src/App.vue`
- Modify: `styles/main.css`
- Test: `frontend/test/app-shell.test.ts`

**Step 1: Write the failing test**
- Add tests for `view` mode:
  - toolbar hidden
  - authoring buttons hidden
  - playback controls visible

**Step 2: Run test to verify it fails**
- Run: `npm run test:frontend -- frontend/test/app-shell.test.ts`
- Expected: FAIL because UI does not react to host mode.

**Step 3: Write minimal implementation**
- Parse URL config in `main.ts`, call store bootstrap.
- Gate editing UI in `App.vue` with store mode flags.
- Add `.view-mode` layout rules in CSS.

**Step 4: Run test to verify it passes**
- Run: `npm run test:frontend -- frontend/test/app-shell.test.ts`
- Expected: PASS.

### Task 5: Deploy artifacts (`viewer.html` + `embed.js`) and docs

**Files:**
- Create: `frontend/viewer.html`
- Create: `frontend/public/embed.js`
- Modify: `frontend/vite.config.ts`
- Modify: `QUICKSTART.md`

**Step 1: Write the failing test**
- Add/modify build test for viewer artifact presence (new small node test under `test/` if needed).

**Step 2: Run test to verify it fails**
- Run: `npm test -- test/<new-test>.test.js`
- Expected: FAIL before files/config are added.

**Step 3: Write minimal implementation**
- Add viewer HTML entry.
- Add static SDK wrapper `embed.js`.
- Configure Vite base for subpath-safe assets.
- Document iframe/SDK usage.

**Step 4: Run test to verify it passes**
- Run: `npm test -- test/<new-test>.test.js`
- Expected: PASS.

### Task 6: End-to-end verification

**Files:**
- Modify: `frontend/e2e/core-path.spec.ts` (if needed)

**Step 1: Run targeted frontend tests**
- Run: `npm run test:frontend -- frontend/test/embed-config.test.ts frontend/test/scene-source-resolver.test.ts frontend/test/simulator-store.test.ts frontend/test/app-shell.test.ts`
- Expected: PASS.

**Step 2: Run full frontend test suite**
- Run: `npm run test:frontend`
- Expected: PASS.

**Step 3: Run build verification**
- Run: `npm run build:frontend`
- Expected: PASS and output contains `frontend/dist/index.html`, `frontend/dist/viewer.html`, `frontend/dist/embed.js`.

**Step 4: Optional browser smoke**
- Run: `npm run test:e2e`
- Expected: PASS core-path smoke.
