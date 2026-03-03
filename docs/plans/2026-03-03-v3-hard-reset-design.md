# V3 Hard Reset Design (No Compatibility Constraints)

Date: 2026-03-03  
Status: Approved (brainstormed and section-validated)  
Decision Owner: Core maintainers

## 1. Goal and Decision

This design defines a hard reset architecture for the simulator with one explicit principle:

- no runtime backward compatibility burden,
- maximum technical debt removal,
- clean modular boundaries,
- strong robustness and extension capacity.

The current codebase has completed the Vue shell migration but remains in a transitional state:
- legacy JS engine and TS frontend are connected by broad adapter boundaries,
- state and interaction responsibilities remain over-concentrated,
- multi-layout behavior is maintained through dense conditional branching.

To achieve long-term maintainability, incremental debt paydown is not sufficient.  
The selected approach is a disruptive V3 rebuild with one-time cutover.

## 2. Target Architecture (Hard Boundaries)

V3 is split into five layers with strict dependency rules.

1. `domain-core` (pure TypeScript, no DOM)
- Scene aggregate
- object models
- physics kernel
- geometry kernel
- expression engine

2. `interaction-core` (state machines)
- pointer FSM
- selection FSM
- transform FSM
- gesture FSM
- outputs commands only

3. `application-core` (orchestration and transactions)
- command bus
- use case handlers
- transaction boundary
- read model projectors

4. `infrastructure` (replaceable adapters)
- canvas renderer adapter
- storage/file adapters
- embed bridge adapter
- telemetry sink adapter

5. `ui-shell` (Vue)
- presentational components
- user intent dispatch only
- no domain mutation logic

### Boundary Rules

1. UI cannot mutate domain objects directly.
2. Domain layer cannot reference `window`, `document`, `localStorage`, `FileReader`.
3. Interaction layer cannot call rendering APIs.
4. Infrastructure layer cannot contain business rules.
5. Runtime scene protocol is V3-only (`version: "3.0"`).

## 3. Data Flow, Command Model, and Transactions

All user behavior is processed as intent -> command -> transaction -> projection.

### Flow

1. UI emits `Intent` (e.g. create object, resize handle, load scene).
2. Interaction FSM reduces raw events (pointer/touch/keyboard) into high-level intents.
3. Application command bus applies middleware:
- validation
- host/edit permission gate
- idempotency and dedupe
- optional throttling
4. Use case opens a transaction:
- reads aggregate version,
- applies command in pure handler,
- produces domain events.
5. Commit succeeds only if:
- preconditions pass,
- aggregate version check passes,
- domain rules pass.
6. On failure:
- rollback to pre-transaction snapshot,
- return structured error result.
7. On success:
- read model projector updates UI state model,
- render projector emits render snapshot to renderer adapter.

### Non-negotiable Constraints

1. No half-committed state.
2. No direct throw-through to component layer.
3. All mutation paths are command-based and auditable.

## 4. Error Model, Stability, and Observability

V3 uses typed result-based error handling.

### Error Taxonomy

1. `ValidationError`
2. `DomainRuleError`
3. `InfrastructureError`
4. `SystemError`

Every error contains:
- `code`
- `messageKey`
- `context`
- `recoverable`

UI maps `messageKey` to localized messages and never relies on raw stack text.

### Runtime Stability

1. Critical use cases (drag/zoom/import/embed) are protected by feature gates.
2. Kill switch paths are defined for emergency degradation.
3. Transaction rollback count and failure ratio are first-class metrics.

### Observability Streams

1. `AuditEvent` (who changed what)
2. `RuntimeMetric` (command latency, frame cost, rollback count)
3. `DiagnosticEvent` (error class, summarized traces)

Default sink is in-memory ring buffer; export and upstream forwarding are adapter-based.

## 5. Test System and Quality Gates (Rebuilt)

Testing strategy is shifted from UI-heavy to domain-first.

1. `test:domain`
- deterministic replay
- physics and geometry contracts
- scene aggregate invariants

2. `test:state-machines`
- state transition tables for pointer/selection/transform/gesture
- event-sequence determinism

3. `test:app`
- transaction commit/rollback
- version conflict behavior
- idempotency behavior

4. `test:adapters`
- canvas/storage/file/embed adapter contracts

5. `test:components`
- binding and rendering contracts only

6. `test:e2e` (reduced)
- keep only critical user paths:
  - create/edit/play
  - import/export
  - embed command path

### Mandatory Gates

1. Replay drift: zero
2. State-machine transition coverage: full transition table coverage
3. Command latency and frame-time p95 thresholds
4. E2E stability threshold with explicit retry budget

## 6. Compatibility Strategy (Explicitly Removed)

V3 runtime accepts only `version: "3.0"` scenes.

V1/V2 are not accepted at runtime.  
Legacy migration is handled by offline CLI tooling only.

This removes:
- runtime compatibility branches,
- conditional schema acceptance paths,
- mixed-version error handling complexity.

## 7. Cutover Plan (One-Time Hard Switch)

### Phase 0 (2-3 days): Freeze and Baseline

1. Freeze feature development on current mainline.
2. Tag baseline release snapshot.
3. Create V3 workspace/module skeleton.

### Phase 1 (1 week): Minimum Vertical Slice

Deliver V3 path for:
1. object creation
2. play/pause loop
3. property edits
4. canvas rendering snapshot path

No reuse of old runtime/store/dragdrop orchestration.

### Phase 2 (1 week): IO, Embed, Mobile Baseline

1. V3 scene IO (`version: "3.0"` only)
2. new embed protocol adapter
3. mobile baseline interaction on new FSM path

### Phase 3 (3-4 days): Hard Cut

1. Switch default app entry to V3.
2. Remove old adapter bridge and deprecated runtime/store interaction path.
3. Replace CI gate set with V3-only matrix.

### Phase 4 (2-3 days): Repository Cleanup

1. Delete dead code and obsolete tests.
2. Update docs index and release documentation.
3. Record closure evidence and residual risk register.

## 8. Acceptance Criteria

V3 cutover is complete only when all items below are true:

1. Core user path works on V3-only runtime.
2. No runtime references to legacy adapter boundary remain.
3. No compatibility branches for V1/V2 remain in runtime code.
4. All mandatory quality gates pass.
5. Performance thresholds are met.
6. Repository-level dead-path cleanup is complete and documented.

## 9. Out-of-Scope

1. No dual-runtime long-lived operation.
2. No preserving old import behavior in runtime.
3. No additional end-user feature scope before architectural cutover closure.

## 10. Decision Summary

Chosen approach: V3 hard reset with no compatibility retention in runtime.

Rationale:
- fastest path to eliminate compounding debt,
- strongest foundation for robustness and extension,
- clearest system boundaries and ownership model,
- reduced long-term maintenance cost despite higher short-term migration cost.
