# Frontend Framework Migration Design (Vue 3 + TypeScript)

Date: 2026-02-12
Status: Approved
Decision Owner: Product/Engineering

## Context

The current application is a modular vanilla JavaScript simulator with Canvas-based rendering and a growing UI layer.

Key current-state facts:
- Entry + orchestration is concentrated in `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/js/main.js`.
- Physics and simulation logic is already separated under `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/js/core`, `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/js/physics`, and `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/js/objects`.
- UI complexity has increased significantly (for example, `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/js/ui/PropertyPanel.js`).
- CSS has a token base and responsive behavior (`/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/styles/theme.css`, `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/styles/main.css`) but does not yet enforce scalable component-level conventions.

Product direction selected in brainstorming:
- Long-term platform architecture (6-12+ month horizon).
- Full rewrite instead of incremental migration.
- Vue 3 + TypeScript + Vite.
- Tailwind CSS + design tokens.
- v1 launch target is core-path compatibility, not 100% parity.

## Final Decisions

1. Perform a full frontend rewrite to Vue 3 + TypeScript.
2. Preserve simulation/canvas behavior via explicit engine contracts, not direct component mutation.
3. Use Tailwind for UI styling velocity and consistency, backed by design tokens for themes.
4. Ship first release when core user journeys are equivalent and protected by automated gates.
5. Enforce rollback-ready release mechanics from day one.

## Goals

- Build a maintainable frontend platform for future features (extensibility, onboarding, collaboration).
- Separate concerns cleanly across engine, rendering, and UI domains.
- Increase delivery confidence with deterministic tests and release gates.
- Keep performance and simulation correctness at least as good as the current implementation.

## Non-Goals

- Immediate migration of all edge-case UI flows in release 1.
- Parallel long-lived new/old frontend operation.
- Adding major new end-user features during migration period.

## Options Considered

### Option A: Monolith replacement with contract testing (Chosen)
- Pros:
  - Cleanest end-state architecture.
  - Removes accumulated coupling in one strategic move.
  - Best long-term velocity for a platform roadmap.
- Cons:
  - Highest short-term delivery risk.
  - Requires strict test and release discipline.

### Option B: Parallel shell migration
- Pros:
  - Lower short-term rollout risk.
- Cons:
  - Transitional complexity persists.
  - Conflicts with the “full rewrite” strategic intent.

### Option C: Engine-first then UI rewrite
- Pros:
  - Can stabilize simulation core early.
- Cons:
  - Slower product-visible progress.
  - Longer migration window.

Rationale for Option A:
Given the explicit strategy choice (platform-first, full rewrite), Option A maximizes long-term leverage while still controlling risk through hard quality gates.

## Target Architecture

### Layer 1: `engine` (domain + simulation)
Responsibilities:
- Object model, scene state, stepping/integration, boundaries, serialization.
- No direct DOM dependency.

Inputs:
- Domain commands and validated payloads.

Outputs:
- Deterministic state snapshots and simulation metrics.

Migration source:
- `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/js/core`
- `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/js/physics`
- `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/js/objects`

### Layer 2: `render-canvas` (rendering adapter)
Responsibilities:
- Multi-layer Canvas rendering from immutable/owned state snapshots.
- No business rule ownership.

Migration source:
- `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/js/rendering`
- `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/js/core/Renderer.js`

### Layer 3: `app-ui` (Vue app)
Responsibilities:
- Interaction orchestration, forms, panels, workflow state, user feedback.
- Calls command APIs; never mutates engine internals directly.

Migration source:
- `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/js/ui`
- `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/styles`

## UI Component Plan

Core components:
- `AppShell`: Global layout, major panel composition.
- `ToolbarPanel`: Object creation, presets.
- `CanvasViewport`: Canvas host, pointer/wheel interaction bridge.
- `PropertyDrawer`: Schema-driven property editing.
- `SimulationControls`: Play/pause, time-step, gravity, boundary controls.
- `SceneIOPanel`: Save/load/import/export workflows.

Supporting cross-cutting components:
- `NotificationCenter`
- `ModalHost`
- `ThemeToggle`
- `StatusBar`

## State Management and Data Flow

Pinia stores:
- `simulationStore`: running state, clock, perf counters, loop controls.
- `sceneStore`: scene object graph, selection, command dispatch.
- `uiStore`: drawer/modal/notification/theme/session UI state.

Strict write path:
- Component event -> command creator -> store validation -> engine apply -> renderer refresh -> store-derived UI updates.

Rules:
- No component writes to engine object fields directly.
- All state transitions are command-based and testable.
- Scene loading, demo mode transitions, and bulk updates are transactional.

This command boundary is required to support future undo/redo, replay, and auditability.

## Styling System

Chosen stack:
- Tailwind CSS utility-first approach.
- Design tokens as source of truth for colors/spacing/radius/shadows/motion.

Implementation guidance:
- Keep existing semantic token naming patterns when practical.
- Configure Tailwind theme extension from token definitions.
- Maintain current dark/light capability parity from `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/styles/theme.css`.
- Use component-level composition patterns to avoid utility sprawl.

## Error Handling Strategy

Replace ad-hoc scattered try/catch notifications with a typed result model.

Command execution result types:
- `success`
- `validation_error`
- `engine_error`
- `io_error`

Behavior:
- Engine and IO layers return typed failures with actionable metadata.
- UI maps result types to messages and inline indicators.
- Form-level and field-level validation feedback is deterministic and localizable.

Data protocol safety:
- Scene payloads validated with schema (recommended: zod).
- Scene format includes explicit `version`.
- Compatibility handled via versioned migration functions.

Expression safety:
- Expression compilation/validation occurs at engine boundary.
- Allowed operations/functions remain whitelisted.
- Invalid expressions never enter simulation runtime.

## Testing Strategy and Release Gates

### L1: Domain unit tests
Scope:
- Force calculation, integration correctness, boundary behavior.

### L2: Deterministic replay consistency tests
Scope:
- Fixed initial states replayed for N steps.
- Position/velocity/error thresholds enforced.

### L3: Data contract tests
Scope:
- Import/export schema validity.
- Version migration path correctness.
- Backward compatibility policy enforcement.

### L4: End-to-end tests (Playwright)
Scope for core-path compatibility:
- Create object
- Edit properties
- Play/pause simulation
- Import/export scene
- Enter/exit demo mode

Performance gates:
- Same benchmark scenes as baseline.
- Frame rate and step-time cannot regress beyond agreed budget.

Release is blocked unless all mandatory gates are green.

## Milestones (Core-Path Compatibility Scope)

### M0: Baseline and freeze (Week 0)
- Freeze behavior checklist from current app.
- Capture golden scenes and benchmark baselines.
- Limit old-line changes to critical production fixes.

### M1: Platform scaffold + engine contract (Weeks 1-2)
- Vue 3 + TS + Vite + Tailwind + Pinia project skeleton.
- CI, lint, test pipeline, typed command contracts.
- Initial engine interface and smoke tests.

### M2: Core editing loop (Weeks 3-4)
- Object creation, selection, property editing.
- Scene store command path integrated with renderer.
- Relevant L1/L2/L4 tests in place.

### M3: Simulation + IO parity (Weeks 4-5)
- Play/pause, timestep/gravity/boundary controls.
- Import/export + save/load compatibility policy.
- Contract and E2E coverage for IO flows.

### M4: Demo mode + hardening (Week 6)
- Demo session entry/exit, zoom/session behavior.
- Golden-scene parity pass.
- Performance gate verification and release candidate.

## Risk Register and Mitigation

### Risk 1: Behavioral mismatch vs current app
Mitigation:
- Golden-scene replay tests.
- Explicit parity checklist by milestone.

### Risk 2: Performance regression
Mitigation:
- Benchmark suites in CI.
- Step-time/FPS budgets as release blockers.

### Risk 3: Scene compatibility breaks
Mitigation:
- Versioned schema and migration chain.
- Real-world sample regression corpus.

### Risk 4: Scope creep during rewrite
Mitigation:
- Core-path scope lock until M4.
- New feature requests deferred or explicitly traded off.

## Rollback Plan

- Keep deployable old frontend artifact tagged and reproducible.
- Provide one-step operational rollback path in release runbook.
- During launch window, if P0/P1 issue occurs:
  - Immediately route traffic back to old frontend.
  - Freeze new-write paths if data compatibility is at risk.
  - Patch and re-qualify under full gate suite before re-release.

## Acceptance Criteria

The migration is considered successful only if:
- Core-path flows are functionally equivalent.
- Replay consistency and performance gates pass.
- Data IO contracts are validated for the defined compatibility policy.
- Rollback drill has been executed and documented.

## Next Step

Ready to set up for implementation using a detailed execution plan and isolated worktree.
