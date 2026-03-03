# Current Vue Architecture

Date: 2026-03-03

## Runtime Topology

1. `frontend/src/main.ts` mounts Vue app at `#root`.
2. `frontend/src/App.vue` is the only UI orchestration entry.
3. `frontend/src/stores/simulatorStore.ts` dispatches intents to V3 application use-cases.
4. `frontend/src/v3/*` is the runtime core (domain/application/interaction/infrastructure).
5. `frontend/src/v3/domain/geometry.ts` is the single geometry rule source for hit-test + render projection.
6. Legacy runtime bridge files have been removed from active frontend execution path.

## Data Flow

User interaction  
-> `App.vue` event handler  
-> `simulatorStore` action  
-> `v3/ui-adapter/intentMappers.ts`  
-> `v3/application/useCases/simulatorApplication.ts` command  
-> domain aggregate transition + read-model projection  
-> render adapter publish  
-> `simulatorStore` reactive state update  
-> Vue UI refresh

## Key Boundaries

- Vue-owned:
  - Layout and controls (`App.vue`, Vue components)
  - View binding and event dispatch
- Store-owned:
  - Runtime orchestration and host-mode behavior
  - Read model to UI state projection
- V3 application-owned:
  - Command transaction, revision checks, typed failures
  - Scene lifecycle (`create/move/select/edit/delete/clear/load/save`)
- V3 domain-owned:
  - Aggregate state and deterministic state transitions
  - Geometry rules for hit-test and render projection
- Infrastructure-owned:
  - Scene storage adapter
  - Render snapshot adapter

## Core Files

- Entry:
  - `frontend/index.html`
  - `frontend/src/main.ts`
- UI:
  - `frontend/src/App.vue`
  - `frontend/src/components/CanvasViewport.vue`
- Store:
  - `frontend/src/stores/simulatorStore.ts`
- V3 core:
  - `frontend/src/v3/domain/sceneAggregate.ts`
  - `frontend/src/v3/domain/geometry.ts`
  - `frontend/src/v3/application/useCases/simulatorApplication.ts`
  - `frontend/src/v3/application/readModel/projectSceneReadModel.ts`
  - `frontend/src/v3/interaction/pointerFsm.ts`
  - `frontend/src/v3/infrastructure/localSceneStorageAdapter.ts`
  - `frontend/src/v3/infrastructure/inMemoryRenderAdapter.ts`
- Scene IO:
  - `frontend/src/io/sceneSchema.ts`
  - `frontend/src/io/sceneIO.ts`

## Quality Gates

- `npm run lint:frontend`
- `npm run typecheck:frontend`
- `npm run test:frontend`
- `npm run test:e2e`
- `npm run quality:all`
