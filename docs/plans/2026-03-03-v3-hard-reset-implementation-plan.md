# V3 Hard Reset Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver the first executable V3 vertical slice with strict boundaries: domain aggregate, transactional command bus, and pointer interaction FSM intents.

**Architecture:** Introduce a new `frontend/src/v3` module tree and keep current runtime untouched. Build command-first state transitions with explicit rollback and version checks. Add FSM-driven interaction intent outputs to replace direct UI mutation paths.

**Tech Stack:** TypeScript, Vitest, Vue project toolchain (Vite), existing frontend test infrastructure.

---

### Task 1: Scaffold V3 Module Boundaries

**Files:**
- Create: `frontend/src/v3/domain/types.ts`
- Create: `frontend/src/v3/application/types.ts`
- Create: `frontend/src/v3/interaction/types.ts`

**Step 1: Add failing compile-time usage tests**
- Write tests importing missing files to force RED.

**Step 2: Run target tests (RED)**

Run:
```bash
npm run test:frontend -- frontend/test/v3-scene-aggregate.test.ts
```

Expected:
- FAIL with module-not-found error.

**Step 3: Add minimal type-only module skeletons**
- Define `SceneAggregateState`, `SceneObjectRecord`, `CommandEnvelope`, `CommandResult`, and pointer event/intent types.

**Step 4: Re-run target tests**

Run:
```bash
npm run test:frontend -- frontend/test/v3-scene-aggregate.test.ts
```

Expected:
- Move from import failure to behavior assertion failure.

---

### Task 2: Implement V3 Scene Aggregate (TDD)

**Files:**
- Create: `frontend/test/v3-scene-aggregate.test.ts`
- Create: `frontend/src/v3/domain/sceneAggregate.ts`

**Step 1: Write failing tests**
- `createInitialSceneAggregate` returns V3 defaults (`version: "3.0"`, `revision: 0`, `running: false`, empty objects).
- `applyCreateObject` appends object and increments revision.
- `applyToggleRunning` toggles running and increments revision.
- `applySetTimeStep` accepts positive finite value and rejects invalid values.

**Step 2: Run tests (RED)**

Run:
```bash
npm run test:frontend -- frontend/test/v3-scene-aggregate.test.ts
```

Expected:
- FAIL for missing functions/invalid behavior.

**Step 3: Implement minimal aggregate functions**
- Add pure immutable state transition functions.
- Throw validation error for invalid create/timestep inputs.

**Step 4: Run tests (GREEN)**

Run:
```bash
npm run test:frontend -- frontend/test/v3-scene-aggregate.test.ts
```

Expected:
- PASS.

---

### Task 3: Implement Transactional Command Bus (TDD)

**Files:**
- Create: `frontend/test/v3-command-bus.test.ts`
- Create: `frontend/src/v3/application/commandBus.ts`

**Step 1: Write failing tests**
- Unknown command returns typed error.
- Expected revision mismatch returns version conflict.
- Successful command commits new state.
- Handler throw triggers rollback to pre-command snapshot.

**Step 2: Run tests (RED)**

Run:
```bash
npm run test:frontend -- frontend/test/v3-command-bus.test.ts
```

Expected:
- FAIL.

**Step 3: Implement minimal transactional bus**
- Register handlers by command type.
- Validate revision precondition.
- Snapshot state before execution and restore on failure.
- Return typed `ok/error` result.

**Step 4: Run tests (GREEN)**

Run:
```bash
npm run test:frontend -- frontend/test/v3-command-bus.test.ts
```

Expected:
- PASS.

---

### Task 4: Implement Pointer FSM Intent Reduction (TDD)

**Files:**
- Create: `frontend/test/v3-pointer-fsm.test.ts`
- Create: `frontend/src/v3/interaction/pointerFsm.ts`

**Step 1: Write failing tests**
- Press + release (no drag) emits `select` intent.
- Press + move beyond threshold emits `begin_drag`.
- Drag move emits `update_drag`.
- Drag release emits `commit_drag`.
- Pointer cancel emits `cancel_drag` and resets state.

**Step 2: Run tests (RED)**

Run:
```bash
npm run test:frontend -- frontend/test/v3-pointer-fsm.test.ts
```

Expected:
- FAIL.

**Step 3: Implement minimal FSM**
- States: `idle -> pressed -> dragging -> idle`.
- Ignore mismatched pointer id events.
- Emit intent list per input event.

**Step 4: Run tests (GREEN)**

Run:
```bash
npm run test:frontend -- frontend/test/v3-pointer-fsm.test.ts
```

Expected:
- PASS.

---

### Task 5: Integrate and Verify

**Files:**
- Modify: `frontend/test/layer-boundaries.test.ts` (optional V3 boundary assertion)
- Modify: `frontend/src/v3/*` index exports (if needed)

**Step 1: Run V3 target suite**

Run:
```bash
npm run test:frontend -- frontend/test/v3-*.test.ts
```

Expected:
- PASS.

**Step 2: Run frontend full suite**

Run:
```bash
npm run test:frontend
```

Expected:
- PASS with no regressions.

**Step 3: Commit**

```bash
git add frontend/src/v3 frontend/test/v3-*.test.ts docs/plans/2026-03-03-v3-hard-reset-implementation-plan.md
git commit -m "feat(v3): add initial domain, command bus, and pointer fsm foundation"
```

---

### Task 6A: Add failing tests for use-case pipeline and read model

**Files:**
- Create: `frontend/test/v3-simulator-application.test.ts`
- Create: `frontend/test/v3-read-model.test.ts`

**Step 1: Write failing tests**
- `createV3SimulatorApplication` returns initial read model from aggregate state.
- `createObjectAt` updates state through command bus and updates read model (`objectCount`).
- `setObjectProps` updates object props (edit path).
- `toggleRunning` updates running state (play/pause path).
- Invalid time step edit returns typed error and keeps previous state.
- Read-model projection derives counts and labels from domain state.

**Step 2: Run tests to verify RED**

Run:
```bash
npm run test:frontend -- frontend/test/v3-simulator-application.test.ts frontend/test/v3-read-model.test.ts
```

Expected:
- FAIL (missing modules/functions).

---

### Task 6B: Implement minimal use-case and read-model modules

**Files:**
- Create: `frontend/src/v3/application/useCases/simulatorApplication.ts`
- Create: `frontend/src/v3/application/readModel/projectSceneReadModel.ts`
- Modify: `frontend/src/v3/domain/sceneAggregate.ts`

**Step 1: Implement minimal read-model projector**
- Input: `SceneAggregateState`
- Output includes:
  - `revision`
  - `running`
  - `timeStep`
  - `timeStepLabel`
  - `objectCount`

**Step 2: Implement minimal use-case orchestrator**
- Compose:
  - aggregate state holder
  - transactional command bus
  - command handlers for:
    - `create_object`
    - `set_object_props`
    - `toggle_running`
    - `set_time_step`
- Expose methods:
  - `getState()`
  - `getReadModel()`
  - `createObjectAt(...)`
  - `setObjectProps(...)`
  - `toggleRunning()`
  - `setTimeStep(...)`

**Step 3: Add domain helper for edit path**
- Add `applySetObjectProps` to aggregate reducer set.

**Step 4: Run tests to verify GREEN**

Run:
```bash
npm run test:frontend -- frontend/test/v3-simulator-application.test.ts frontend/test/v3-read-model.test.ts
```

Expected:
- PASS.

---

### Task 6C: Add failing adapter contract tests

**Files:**
- Create: `frontend/test/v3-infrastructure-adapters.test.ts`

**Step 1: Write failing tests**
- Memory scene storage adapter:
  - `save` then `load` returns deep-cloned state.
  - loading unknown key returns `null`.
- In-memory render adapter:
  - accepts render snapshot payload.
  - stores last snapshot for inspection.

**Step 2: Run tests to verify RED**

Run:
```bash
npm run test:frontend -- frontend/test/v3-infrastructure-adapters.test.ts
```

Expected:
- FAIL (missing adapters).

---

### Task 6D: Implement minimal adapters and verify all

**Files:**
- Create: `frontend/src/v3/infrastructure/memorySceneStorageAdapter.ts`
- Create: `frontend/src/v3/infrastructure/inMemoryRenderAdapter.ts`
- Create: `frontend/src/v3/ui-adapter/intentMappers.ts`
- Modify: `frontend/src/v3/application/useCases/simulatorApplication.ts`

**Step 1: Implement adapters**
- Storage adapter: in-memory map with clone-on-save/load.
- Render adapter: capture latest snapshot and expose getter.

**Step 2: Wire optional render adapter into simulator application**
- On successful commands, publish projected read model snapshot.

**Step 3: Add simple UI-intent mapper helper**
- Keep minimal mapper for command payload normalization.

**Step 4: Run adapter tests (GREEN)**

Run:
```bash
npm run test:frontend -- frontend/test/v3-infrastructure-adapters.test.ts
```

Expected:
- PASS.

**Step 5: Run V3 suite and full frontend suite**

Run:
```bash
npm run test:frontend -- frontend/test/v3-*.test.ts
npm run test:frontend
npm run lint:frontend
npm run typecheck:frontend
```

Expected:
- PASS with no regressions.

**Step 6: Commit**

```bash
git add frontend/src/v3 frontend/test/v3-*.test.ts docs/plans/2026-03-03-v3-hard-reset-implementation-plan.md
git commit -m "feat(v3): add simulator use-case pipeline and infrastructure adapters"
```
