# Current Vue Architecture

Date: 2026-02-25

## Runtime Topology

1. `frontend/src/main.ts` mounts Vue app at `#root`.
2. `frontend/src/App.vue` is the only UI orchestration entry.
3. `frontend/src/stores/simulatorStore.ts` is the unified state/action layer.
4. `frontend/src/runtime/simulatorRuntime.ts` bridges Vue actions to engine core.
5. Engine core remains in `js/core/*`, `js/objects/*`, `js/physics/*`, `js/rendering/*`.

## Data Flow

User interaction  
-> `App.vue` event handler  
-> `simulatorStore` action  
-> `SimulatorRuntime` method  
-> engine update/render  
-> snapshot callback  
-> `simulatorStore` reactive state update  
-> Vue UI refresh

## Key Boundaries

- Vue-owned:
  - Layout and controls (`App.vue`, Vue components)
  - Property drawer rendering and form draft
  - Store state (`running/demo/fps/counts/status/panel`)
- Runtime-owned:
  - Scene lifecycle
  - Physics loop and render scheduling
  - Scene IO/import/export/save/load
  - Demo mode state machine
- Engine-owned:
  - Object model and registry
  - Physics calculations
  - Canvas rendering
  - Drag/resize interactions

## Core Files

- Entry:
  - `index.html`
  - `frontend/index.html`
  - `frontend/src/main.ts`
- Vue layer:
  - `frontend/src/App.vue`
  - `frontend/src/components/ToolbarPanel.vue`
  - `frontend/src/components/CanvasViewport.vue`
  - `frontend/src/components/PropertyDrawer.vue`
- State/runtime:
  - `frontend/src/stores/simulatorStore.ts`
  - `frontend/src/runtime/simulatorRuntime.ts`
- Engine:
  - `js/core/Scene.js`
  - `js/core/Renderer.js`
  - `js/core/PhysicsEngine.js`
  - `js/interactions/DragDropManager.js`
  - `js/core/registerObjects.js`

## Quality Gates

- `npm test`
- `npm run test:frontend`
- `npm run test:e2e`
- `npm run quality:all`
- `npm run build:frontend`
