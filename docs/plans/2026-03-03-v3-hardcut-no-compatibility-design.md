# V3 Hard Cut Design (No Runtime Compatibility Burden)

Date: 2026-03-03  
Status: Approved (section-validated)  
Decision Owner: Core maintainers

## 1. Goal and Decision

This design defines a hard cut to V3 with one explicit policy:

1. No runtime backward compatibility burden.
2. Maximum technical debt removal.
3. Strong modular boundaries with single ownership.
4. High robustness and extension readiness.

Current repository status is transitional:

1. Vue/TypeScript shell migration is complete.
2. Runtime path still depends on broad legacy JS bridge surfaces.
3. Store/runtime/interaction responsibilities remain concentrated.
4. Multi-device behavior still depends on dense conditional branches.

Given the target (clean, robust, decoupled, extensible), incremental paydown is insufficient.  
Chosen approach: one-time V3 hard cut, no dual-runtime long-lived operation.

## 2. Architecture and Hard Boundaries

V3 is split into five layers with strict dependency rules:

1. `domain-core`:
   - pure TypeScript, no DOM/browser APIs
   - scene aggregate, object contracts, physics/geometry rules
2. `interaction-core`:
   - pointer/gesture/selection FSMs
   - event reduction only, output intents/commands
3. `application-core`:
   - command bus, use-case handlers, transactions, projection
4. `infrastructure`:
   - renderer/storage/embed/telemetry adapters
   - implementation-only, no business rules
5. `ui-shell`:
   - Vue components and bindings
   - intent dispatch + read model rendering only

Non-negotiable rules:

1. UI must not mutate domain state directly.
2. Domain layer must not reference `window/document/localStorage/FileReader`.
3. Interaction layer must not call rendering APIs.
4. Infrastructure layer must not own domain policy.
5. Runtime scene protocol must be `version: "3.0"` only.

## 3. Data Flow, Transaction Semantics, and Error Model

Canonical runtime flow:

`Intent -> Command -> Transaction -> Domain Events -> ReadModel -> RenderSnapshot`

Command envelope contract:

1. `commandId`
2. `type`
3. `payload`
4. `expectedRevision`
5. `actor`
6. `source`
7. `timestamp`

Transaction invariants:

1. Start from immutable baseline snapshot.
2. Apply command on working copy only.
3. Commit only when all validations and domain rules pass.
4. Any failure triggers rollback to baseline.
5. No throw-through to components.

Conflict policy:

1. Optimistic concurrency only.
2. `expectedRevision !== currentRevision` => `version_conflict`.

Typed error taxonomy:

1. `validation_error`
2. `domain_rule_error`
3. `infra_error`
4. `system_error`

Every error carries:

1. `code`
2. `messageKey`
3. `context`
4. `recoverable`

UI must map `messageKey` and avoid dependence on raw stack/error text.

## 4. Repository Refactor Blueprint and Deletion Order

Execution principle: "take over first, then delete old path in the same cycle."

### Week 1 (Structure takeover)

1. Finalize V3 module tree under `frontend/src/v3/*`.
2. Rewire app entry and UI shell to dispatch V3 intents only.
3. Switch runtime scene schema gate to V3-only (`3.0`).
4. Keep old runtime code present but not on main execution path.

### Week 2 (Legacy runtime off-path)

1. Remove production references to:
   - `frontend/src/runtime/simulatorRuntime.ts`
   - `frontend/src/engine/runtimeEngineBridge.ts`
   - `frontend/src/engine/storeEngineBridge.ts`
   - `frontend/src/engine/internal/legacyJsAdapter.ts`
   - `frontend/src/types/legacy-runtime.d.ts`
2. Downgrade `js/*` runtime modules to migration-reference status only.
3. Remove duplicated compatibility validation branches.

### Week 3 (Hard cleanup and gate replacement)

1. Delete dead paths and obsolete tests.
2. Replace CI gates with V3-only quality matrix.
3. Record closure evidence and residual risk register.

## 5. Testing Strategy Rebuild and CI Gates

Shift from UI-heavy validation to core-contract validation.

New test layers:

1. `test:domain`:
   - aggregate invariants, deterministic replay, physics/geometry contracts
2. `test:interaction`:
   - full FSM transition-table coverage
3. `test:application`:
   - command commit/rollback, conflict/idempotency behavior
4. `test:adapters`:
   - renderer/storage/embed/telemetry adapter contracts
5. `test:components`:
   - binding/render contracts only
6. `test:e2e`:
   - reduced to critical path only:
     - create/edit/play
     - import/export
     - embed command roundtrip

Mandatory CI gates:

1. Lint + typecheck + all V3 core suites pass.
2. Replay drift = zero.
3. FSM transition coverage = 100%.
4. Command latency and frame-time p95 under defined threshold.
5. Reduced E2E stability within retry budget.

## 6. Delivery Rhythm and Team Parallelization

### Execution rhythm

1. Freeze feature scope for 2 days.
2. Tag baseline snapshot for emergency reference.
3. Run 3 short hard-cut sprints:
   - Sprint A (5d): minimal vertical slice end-to-end on V3
   - Sprint B (5d): FSM + scene IO + property edit + render projection
   - Sprint C (4d): embed/read-only/telemetry/perf gates + cleanup
4. End every sprint with at least one legacy-path deletion task.

### Parallel streams

1. Domain/Application stream
2. Interaction stream
3. Infrastructure stream
4. UI shell stream
5. Quality/Platform stream

Coordination rules:

1. Freeze cross-stream contracts early (`types/errors/command/read-model`).
2. Daily trunk integration with contract tests.
3. No stream may block trunk > 24h; submit minimum runnable fallback first.

## 7. Risks and Emergency Strategy (No Dual-Stack Rollback)

Primary risks:

1. Cutover feature completeness gap.
2. Hidden coupling surfacing late during legacy-path deletion.
3. Performance regression after command-transaction indirection.
4. Embed integration breaks due protocol hardening.
5. CI flakiness if gate replacement and suite shrink are not synchronized.

Mitigation:

1. Enforce vertical-slice milestones before broad migration.
2. Run contract tests at every boundary before deleting old modules.
3. Introduce command latency/frame-time telemetry before cutover day.
4. Freeze embed protocol schema and add strict adapter contract tests.
5. Keep test-scope reduction and CI gate update in the same PR batch.

Emergency handling policy:

1. No long-lived dual runtime rollback.
2. If severe incident appears after cutover:
   - activate kill-switch behavior (degrade non-critical features),
   - retain write safety and transaction consistency,
   - hotfix on V3 path only.
3. Baseline tag is for emergency reference and forensic diff, not for re-opening compatibility paths.

## 8. Acceptance Criteria

Cutover is complete only when all are true:

1. Core user path runs fully on V3 runtime.
2. No runtime references to legacy adapter boundary remain.
3. No runtime compatibility branches for V1/V2 remain.
4. V3 mandatory quality gates pass.
5. Performance thresholds pass.
6. Dead-path cleanup is completed and documented.

## 9. Out of Scope

1. No dual-runtime long-lived operation.
2. No runtime preservation of legacy import behavior.
3. No new end-user features before cutover closure.

## 10. Decision Summary

Selected path: V3 hard cut with no runtime compatibility retention.

Rationale:

1. Fastest path to remove compounding debt.
2. Strongest base for robustness and extensibility.
3. Clear boundary ownership and lower long-term maintenance cost.
4. Aligns directly with current strategic objective: clean, decoupled, extensible architecture.
