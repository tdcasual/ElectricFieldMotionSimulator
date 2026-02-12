# Vue 3 + TypeScript Frontend Rewrite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the simulator frontend with Vue 3 + TypeScript + Tailwind while preserving core-path behavior (create/edit/play/IO/demo mode) and enforcing deterministic quality gates.

**Architecture:** Create a layered architecture: `engine` (domain simulation, no DOM), `render-canvas` (canvas adapter), and `app-ui` (Vue + Pinia command-driven UI). Every state change goes through typed commands in stores, and all release decisions are guarded by replay, contract, E2E, and performance checks.

**Tech Stack:** Vue 3, TypeScript, Vite, Pinia, Tailwind CSS, Vitest, Playwright, Zod, Node test runner (`node --test`).

---

## Milestone Map

- `M0` Baseline freeze + parity assets (Tasks 1-3)
- `M1` Project scaffold + architecture boundaries (Tasks 4-7)
- `M2` Core editing loop parity (Tasks 8-11)
- `M3` Simulation + IO parity (Tasks 12-15)
- `M4` Demo mode + hardening + release gates (Tasks 16-19)

Use these supporting skills during implementation:
- `@superpowers/test-driven-development`
- `@superpowers/systematic-debugging`
- `@superpowers/verification-before-completion`
- `@superpowers/requesting-code-review`

## Task 1 (M0): Add Core-Path Parity Checklist

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/docs/migration/parity-checklist.md`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/README.md`
- Test: N/A (document task)

**Step 1: Write checklist doc with explicit acceptance rows**

```markdown
# Core-Path Parity Checklist

| Flow | Old App | New App | Status |
|---|---|---|---|
| Create object | yes | pending | TODO |
| Edit properties | yes | pending | TODO |
| Play/Pause | yes | pending | TODO |
| Import/Export | yes | pending | TODO |
| Demo mode | yes | pending | TODO |
```

**Step 2: Link checklist from README migration section**

```markdown
## Frontend Rewrite Tracking
- Parity checklist: `docs/migration/parity-checklist.md`
```

**Step 3: Verify link resolves locally**

Run: `rg -n "Frontend Rewrite Tracking|parity-checklist" README.md docs/migration/parity-checklist.md`
Expected: 2+ matches.

**Step 4: Commit**

```bash
git add docs/migration/parity-checklist.md README.md
git commit -m "docs: add core-path parity checklist"
```

## Task 2 (M0): Add Golden Scene Fixtures for Replay

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/test/fixtures/replay/basic-electric.json`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/test/fixtures/replay/magnetic-arc.json`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/test/fixtures/replay/capacitor-deflection.json`
- Test: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/test/replay_fixtures.test.js`

**Step 1: Write failing fixture test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const names = ['basic-electric', 'magnetic-arc', 'capacitor-deflection'];

test('replay fixtures exist and have objects array', () => {
  for (const name of names) {
    const raw = fs.readFileSync(`test/fixtures/replay/${name}.json`, 'utf8');
    const data = JSON.parse(raw);
    assert.equal(Array.isArray(data.objects), true);
  }
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/replay_fixtures.test.js`
Expected: FAIL with missing fixture files.

**Step 3: Add fixture JSON files (minimal valid objects + settings)**

```json
{
  "version": "2.0",
  "settings": { "gravity": 10, "pixelsPerMeter": 1 },
  "objects": []
}
```

**Step 4: Run test to verify it passes**

Run: `node --test test/replay_fixtures.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add test/fixtures/replay/*.json test/replay_fixtures.test.js
git commit -m "test: add replay fixture corpus"
```

## Task 3 (M0): Add Replay Baseline Runner

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/test/replay_consistency.test.js`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/js/core/Scene.js`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/js/core/PhysicsEngine.js`

**Step 1: Write failing replay consistency test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';

// pseudo-helper; implement concrete imports in step 3
import { runReplay } from './helpers/replayRunner.js';

test('replay result is deterministic for 500 steps', () => {
  const a = runReplay('test/fixtures/replay/basic-electric.json', 500, 0.016);
  const b = runReplay('test/fixtures/replay/basic-electric.json', 500, 0.016);
  assert.deepEqual(a.signature, b.signature);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/replay_consistency.test.js`
Expected: FAIL with helper/import errors.

**Step 3: Implement minimal replay runner and stable signature format**

```js
export function signatureFromScene(scene) {
  return scene.objects.map(o => ({
    id: o.id,
    x: Number(o.x?.toFixed?.(4) ?? 0),
    y: Number(o.y?.toFixed?.(4) ?? 0)
  }));
}
```

**Step 4: Run targeted and full tests**

Run: `node --test test/replay_consistency.test.js && npm test`
Expected: both PASS.

**Step 5: Commit**

```bash
git add test/replay_consistency.test.js test/helpers/replayRunner.js js/core/Scene.js js/core/PhysicsEngine.js
git commit -m "test: add deterministic replay baseline runner"
```

## Task 4 (M1): Scaffold Vue 3 + TypeScript App Shell

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/index.html`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/main.ts`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/App.vue`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/vite.config.ts`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/tsconfig.json`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/package.json`

**Step 1: Write failing smoke test for frontend mount**

```ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '../src/App.vue';

describe('App shell', () => {
  it('renders app shell root', () => {
    const wrapper = mount(App);
    expect(wrapper.find('[data-testid="app-shell"]').exists()).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- frontend/test/app-shell.test.ts`
Expected: FAIL (frontend toolchain missing).

**Step 3: Create minimal Vite + Vue + TS scaffold and scripts**

```json
{
  "scripts": {
    "dev:frontend": "vite --config frontend/vite.config.ts",
    "build:frontend": "vite build --config frontend/vite.config.ts",
    "test:frontend": "vitest --config frontend/vite.config.ts run"
  }
}
```

**Step 4: Run smoke test**

Run: `npm run test:frontend -- frontend/test/app-shell.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend package.json package-lock.json
git commit -m "feat(frontend): scaffold vue3 + typescript app shell"
```

## Task 5 (M1): Configure Tailwind + Design Tokens

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/tailwind.config.ts`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/postcss.config.cjs`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/styles/tokens.css`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/styles/index.css`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/main.ts`

**Step 1: Write failing style token test**

```ts
import { describe, it, expect } from 'vitest';

describe('design tokens', () => {
  it('exports primary surface token', async () => {
    const css = await import('../src/styles/tokens.css?raw');
    expect(css.default.includes('--bg-primary')).toBe(true);
  });
});
```

**Step 2: Run to fail**

Run: `npm run test:frontend -- frontend/test/tokens.test.ts`
Expected: FAIL missing file.

**Step 3: Add Tailwind config and token CSS from current theme mapping**

```css
:root {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --text-primary: #cccccc;
}
.light-theme {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #333333;
}
```

**Step 4: Run frontend tests**

Run: `npm run test:frontend`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/tailwind.config.ts frontend/postcss.config.cjs frontend/src/styles
git commit -m "feat(frontend): add tailwind and design-token theme layer"
```

## Task 6 (M1): Create Engine Contract Types

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/engine/types.ts`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/engine/commands.ts`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/test/engine-contract.test.ts`

**Step 1: Write failing type-level/runtime contract test**

```ts
import { describe, it, expect } from 'vitest';
import { isCommand } from '../src/engine/commands';

describe('engine command contract', () => {
  it('accepts addObject command payload', () => {
    expect(isCommand({ type: 'addObject', payload: { objectType: 'particle' } })).toBe(true);
  });
});
```

**Step 2: Run to fail**

Run: `npm run test:frontend -- frontend/test/engine-contract.test.ts`
Expected: FAIL missing modules.

**Step 3: Implement minimal command/type contract**

```ts
export type EngineCommand =
  | { type: 'addObject'; payload: { objectType: string } }
  | { type: 'updateObjectProps'; payload: { id: string; patch: Record<string, unknown> } };

export function isCommand(value: unknown): value is EngineCommand {
  return typeof value === 'object' && value !== null && 'type' in (value as Record<string, unknown>);
}
```

**Step 4: Run test to pass**

Run: `npm run test:frontend -- frontend/test/engine-contract.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/engine frontend/test/engine-contract.test.ts
git commit -m "feat(frontend): add engine command contract types"
```

## Task 7 (M1): Enforce Layer Boundaries in Lint

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/.eslintrc.cjs`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/test/layer-boundaries.test.ts`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/package.json`

**Step 1: Write failing boundary violation fixture test**

```ts
import { describe, it, expect } from 'vitest';
import { execa } from 'execa';

describe('layer boundaries', () => {
  it('rejects ui importing engine internals directly', async () => {
    const { exitCode } = await execa('npm', ['run', 'lint:frontend'], { reject: false });
    expect(exitCode).toBe(0);
  });
});
```

**Step 2: Run to fail**

Run: `npm run test:frontend -- frontend/test/layer-boundaries.test.ts`
Expected: FAIL because lint script/config not present.

**Step 3: Configure lint rules with explicit allowlist imports**

```js
rules: {
  'no-restricted-imports': ['error', {
    patterns: [
      { group: ['../engine/internal/*'], message: 'Use engine public API only.' }
    ]
  }]
}
```

**Step 4: Run lint + tests**

Run: `npm run lint:frontend && npm run test:frontend -- frontend/test/layer-boundaries.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/.eslintrc.cjs frontend/test/layer-boundaries.test.ts package.json package-lock.json
git commit -m "chore(frontend): enforce layer import boundaries"
```

## Task 8 (M2): Build Pinia Scene Store Command Pipeline

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/stores/sceneStore.ts`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/test/scene-store.test.ts`

**Step 1: Write failing store command test**

```ts
import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';
import { useSceneStore } from '../src/stores/sceneStore';

beforeEach(() => setActivePinia(createPinia()));

describe('sceneStore', () => {
  it('dispatches addObject command and updates selected id', () => {
    const store = useSceneStore();
    store.dispatch({ type: 'addObject', payload: { objectType: 'particle' } });
    expect(store.selectedObjectId).not.toBeNull();
  });
});
```

**Step 2: Run to fail**

Run: `npm run test:frontend -- frontend/test/scene-store.test.ts`
Expected: FAIL missing store implementation.

**Step 3: Implement minimal store + command dispatcher**

```ts
export const useSceneStore = defineStore('scene', {
  state: () => ({ selectedObjectId: null as string | null }),
  actions: {
    dispatch(cmd: EngineCommand) {
      if (cmd.type === 'addObject') this.selectedObjectId = crypto.randomUUID();
    }
  }
});
```

**Step 4: Run targeted test**

Run: `npm run test:frontend -- frontend/test/scene-store.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/stores/sceneStore.ts frontend/test/scene-store.test.ts
git commit -m "feat(frontend): add command-driven scene store"
```

## Task 9 (M2): Add CanvasViewport and Renderer Bridge

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/components/CanvasViewport.vue`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/render/rendererBridge.ts`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/test/canvas-viewport.test.ts`

**Step 1: Write failing component test**

```ts
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import CanvasViewport from '../src/components/CanvasViewport.vue';

describe('CanvasViewport', () => {
  it('renders three layered canvases', () => {
    const wrapper = mount(CanvasViewport);
    expect(wrapper.findAll('canvas').length).toBe(3);
  });
});
```

**Step 2: Run to fail**

Run: `npm run test:frontend -- frontend/test/canvas-viewport.test.ts`
Expected: FAIL missing component.

**Step 3: Implement viewport shell + bridge lifecycle hooks**

```vue
<template>
  <section data-testid="canvas-viewport" class="relative h-full w-full">
    <canvas data-layer="bg"></canvas>
    <canvas data-layer="field"></canvas>
    <canvas data-layer="particle"></canvas>
  </section>
</template>
```

**Step 4: Run test and mount smoke run**

Run: `npm run test:frontend -- frontend/test/canvas-viewport.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/CanvasViewport.vue frontend/src/render/rendererBridge.ts frontend/test/canvas-viewport.test.ts
git commit -m "feat(frontend): add canvas viewport and renderer bridge"
```

## Task 10 (M2): Implement Toolbar Object Creation Flow

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/components/ToolbarPanel.vue`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/test/toolbar-panel.test.ts`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/App.vue`

**Step 1: Write failing creation command test**

```ts
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ToolbarPanel from '../src/components/ToolbarPanel.vue';

describe('ToolbarPanel', () => {
  it('renders particle creation button', () => {
    const wrapper = mount(ToolbarPanel);
    expect(wrapper.find('[data-tool="particle"]').exists()).toBe(true);
  });
});
```

**Step 2: Run to fail**

Run: `npm run test:frontend -- frontend/test/toolbar-panel.test.ts`
Expected: FAIL missing component.

**Step 3: Add toolbar component and dispatch addObject command**

```vue
<button data-tool="particle" @click="create('particle')">Particle</button>
```

**Step 4: Run test to pass**

Run: `npm run test:frontend -- frontend/test/toolbar-panel.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/ToolbarPanel.vue frontend/src/App.vue frontend/test/toolbar-panel.test.ts
git commit -m "feat(frontend): add toolbar command flow"
```

## Task 11 (M2): Implement Property Drawer Editing Flow

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/components/PropertyDrawer.vue`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/forms/schemaFormAdapter.ts`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/test/property-drawer.test.ts`

**Step 1: Write failing property apply test**

```ts
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import PropertyDrawer from '../src/components/PropertyDrawer.vue';

describe('PropertyDrawer', () => {
  it('shows apply button and emits apply event', async () => {
    const wrapper = mount(PropertyDrawer, { props: { modelValue: true } });
    await wrapper.find('[data-testid="apply-props"]').trigger('click');
    expect(wrapper.emitted('apply')).toBeTruthy();
  });
});
```

**Step 2: Run to fail**

Run: `npm run test:frontend -- frontend/test/property-drawer.test.ts`
Expected: FAIL.

**Step 3: Add minimal drawer + apply event bridge**

```vue
<button data-testid="apply-props" @click="$emit('apply')">Apply</button>
```

**Step 4: Run test**

Run: `npm run test:frontend -- frontend/test/property-drawer.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/PropertyDrawer.vue frontend/src/forms/schemaFormAdapter.ts frontend/test/property-drawer.test.ts
git commit -m "feat(frontend): add property drawer command bridge"
```

## Task 12 (M3): Add Simulation Store (play/pause/timestep)

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/stores/simulationStore.ts`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/test/simulation-store.test.ts`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/components/SimulationControls.vue`

**Step 1: Write failing store test**

```ts
import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';
import { useSimulationStore } from '../src/stores/simulationStore';

beforeEach(() => setActivePinia(createPinia()));

describe('simulationStore', () => {
  it('toggles running state', () => {
    const store = useSimulationStore();
    expect(store.running).toBe(false);
    store.toggleRunning();
    expect(store.running).toBe(true);
  });
});
```

**Step 2: Run to fail**

Run: `npm run test:frontend -- frontend/test/simulation-store.test.ts`
Expected: FAIL.

**Step 3: Implement minimal store and controls component binding**

```ts
export const useSimulationStore = defineStore('sim', {
  state: () => ({ running: false, timeStep: 0.016 }),
  actions: {
    toggleRunning() { this.running = !this.running; },
    setTimeStep(next: number) { this.timeStep = next; }
  }
});
```

**Step 4: Run targeted test**

Run: `npm run test:frontend -- frontend/test/simulation-store.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/stores/simulationStore.ts frontend/src/components/SimulationControls.vue frontend/test/simulation-store.test.ts
git commit -m "feat(frontend): add simulation store and controls"
```

## Task 13 (M3): Add Scene IO Schema and Validation

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/io/sceneSchema.ts`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/io/sceneIO.ts`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/test/scene-io.test.ts`

**Step 1: Write failing contract test**

```ts
import { describe, it, expect } from 'vitest';
import { validateSceneData } from '../src/io/sceneIO';

describe('scene io', () => {
  it('rejects payload without version', () => {
    const result = validateSceneData({ objects: [] });
    expect(result.ok).toBe(false);
  });
});
```

**Step 2: Run to fail**

Run: `npm run test:frontend -- frontend/test/scene-io.test.ts`
Expected: FAIL.

**Step 3: Implement zod schema + typed result model**

```ts
import { z } from 'zod';

const SceneSchema = z.object({
  version: z.string(),
  settings: z.record(z.any()).default({}),
  objects: z.array(z.record(z.any()))
});
```

**Step 4: Run tests**

Run: `npm run test:frontend -- frontend/test/scene-io.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/io/sceneSchema.ts frontend/src/io/sceneIO.ts frontend/test/scene-io.test.ts
git commit -m "feat(frontend): add scene io zod contract validation"
```

## Task 14 (M3): Add Save/Load Local Storage Adapter

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/io/localSceneStore.ts`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/test/local-scene-store.test.ts`

**Step 1: Write failing adapter test**

```ts
import { describe, it, expect } from 'vitest';
import { saveScene, loadScene } from '../src/io/localSceneStore';

describe('local scene store', () => {
  it('round-trips named scene payload', () => {
    saveScene('demo', { version: '2.0', objects: [], settings: {} });
    expect(loadScene('demo')?.version).toBe('2.0');
  });
});
```

**Step 2: Run to fail**

Run: `npm run test:frontend -- frontend/test/local-scene-store.test.ts`
Expected: FAIL.

**Step 3: Implement minimal localStorage adapter with key namespace**

```ts
const KEY_PREFIX = 'electric-field-scene:';
```

**Step 4: Run test**

Run: `npm run test:frontend -- frontend/test/local-scene-store.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/io/localSceneStore.ts frontend/test/local-scene-store.test.ts
git commit -m "feat(frontend): add local scene persistence adapter"
```

## Task 15 (M3): Add Playwright Core-Path E2E Suite

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/e2e/core-path.spec.ts`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/package.json`

**Step 1: Write failing E2E test skeleton**

```ts
import { test, expect } from '@playwright/test';

test('core path create/edit/play/io/demo', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();
});
```

**Step 2: Run to fail**

Run: `npm run test:e2e -- --grep "core path"`
Expected: FAIL because app selectors/features are incomplete.

**Step 3: Implement missing selectors/hooks in components for E2E control**

```vue
<div data-testid="app-shell"></div>
```

**Step 4: Re-run E2E**

Run: `npm run test:e2e -- --grep "core path"`
Expected: PASS for scaffold scenario; expand assertions in later commits.

**Step 5: Commit**

```bash
git add frontend/e2e/core-path.spec.ts package.json package-lock.json frontend/src
git commit -m "test(frontend): add core-path playwright suite skeleton"
```

## Task 16 (M4): Implement Demo Mode Session Workflow

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/modes/demoSession.ts`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/test/demo-session.test.ts`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/frontend/src/stores/sceneStore.ts`

**Step 1: Write failing demo session test**

```ts
import { describe, it, expect } from 'vitest';
import { createDemoSession } from '../src/modes/demoSession';

describe('demo session', () => {
  it('captures snapshot and restores on exit', () => {
    const session = createDemoSession({ objects: [{ id: 'a' }] });
    const restored = session.exit();
    expect(restored.objects[0].id).toBe('a');
  });
});
```

**Step 2: Run to fail**

Run: `npm run test:frontend -- frontend/test/demo-session.test.ts`
Expected: FAIL.

**Step 3: Implement snapshot-based enter/exit behavior**

```ts
export function createDemoSession(snapshot: unknown) {
  const frozen = JSON.parse(JSON.stringify(snapshot));
  return { exit: () => JSON.parse(JSON.stringify(frozen)) };
}
```

**Step 4: Run test to pass**

Run: `npm run test:frontend -- frontend/test/demo-session.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/modes/demoSession.ts frontend/test/demo-session.test.ts frontend/src/stores/sceneStore.ts
git commit -m "feat(frontend): add demo session snapshot workflow"
```

## Task 17 (M4): Add Performance Budget Test Gate

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/test/perf_budget.test.js`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/test/helpers/perfRunner.js`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/package.json`

**Step 1: Write failing performance test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { runPerfCase } from './helpers/perfRunner.js';

test('step budget under threshold', () => {
  const result = runPerfCase('test/fixtures/replay/basic-electric.json', 2000);
  assert.equal(result.avgStepMs < 0.5, true);
});
```

**Step 2: Run to fail**

Run: `node --test test/perf_budget.test.js`
Expected: FAIL missing helper.

**Step 3: Implement perf runner and baseline constants**

```js
export const PERF_BUDGET_MS = 0.5;
```

**Step 4: Run perf + full tests**

Run: `node --test test/perf_budget.test.js && npm test`
Expected: PASS.

**Step 5: Commit**

```bash
git add test/perf_budget.test.js test/helpers/perfRunner.js package.json
 git commit -m "test: add simulation performance budget gate"
```

## Task 18 (M4): Add CI Gate Pipeline for Frontend + Engine

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/.github/workflows/frontend-rewrite-gates.yml`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/package.json`

**Step 1: Write failing local gate script test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('quality:all script exists', () => {
  const pkg = JSON.parse(require('node:fs').readFileSync('package.json', 'utf8'));
  assert.equal(typeof pkg.scripts['quality:all'], 'string');
});
```

**Step 2: Run to fail**

Run: `node --test test/quality_script.test.js`
Expected: FAIL no script.

**Step 3: Add `quality:all` and workflow job sequence**

```yaml
- run: npm ci
- run: npm test
- run: npm run test:frontend
- run: npm run test:e2e
```

**Step 4: Run quality script locally**

Run: `npm run quality:all`
Expected: PASS.

**Step 5: Commit**

```bash
git add .github/workflows/frontend-rewrite-gates.yml package.json package-lock.json test/quality_script.test.js
git commit -m "ci: add frontend rewrite quality gates workflow"
```

## Task 19 (M4): Write Rollback Runbook + Launch Checklist

**Files:**
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/docs/release/frontend-rewrite-rollback-runbook.md`
- Create: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/docs/release/frontend-rewrite-launch-checklist.md`
- Modify: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/.worktrees/codex/frontend-vue3-rewrite/docs/plans/2026-02-12-frontend-framework-migration-design.md`

**Step 1: Draft failing checklist assertion test (optional doc-lint if available)**

```bash
rg -n "P0|P1|rollback|golden-scene" docs/release/frontend-rewrite-rollback-runbook.md
```

Expected: FAIL before file exists.

**Step 2: Create rollback runbook**

```markdown
# Frontend Rewrite Rollback Runbook
- Trigger: P0/P1 regressions in core path
- Action: Route traffic to old artifact tag
- Data safety: Freeze new write path if schema risk exists
- Exit criteria: All gate suites green again
```

**Step 3: Create launch checklist**

```markdown
# Launch Checklist
- [ ] Core-path E2E pass
- [ ] Replay consistency pass
- [ ] Performance gate pass
- [ ] Rollback drill completed
```

**Step 4: Verify docs contain required terms**

Run: `rg -n "P0|P1|rollback|core-path|performance" docs/release/frontend-rewrite-*.md`
Expected: required terms present.

**Step 5: Commit**

```bash
git add docs/release/frontend-rewrite-rollback-runbook.md docs/release/frontend-rewrite-launch-checklist.md docs/plans/2026-02-12-frontend-framework-migration-design.md
git commit -m "docs: add rewrite launch and rollback runbooks"
```

## Definition of Done (Plan Execution)

- All milestone tasks completed in order (M0 -> M4).
- Parity checklist rows moved from TODO to PASS for core-path flows.
- Mandatory checks green:
  - `npm test`
  - `npm run test:frontend`
  - `npm run test:e2e`
  - performance budget test
- Release runbook and rollback drill signed off.

## Execution Notes

- Keep each task scoped to one commit.
- Do not start the next task until the current task tests pass.
- If any baseline test fails unexpectedly, stop and use `@superpowers/systematic-debugging` before making fixes.

Plan complete and saved to `docs/plans/2026-02-12-vue3-rewrite-implementation-plan.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
