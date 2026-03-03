# Tech Debt Ledger (2026-03-03)

Date: 2026-03-03  
Owner: Core maintainers  
Status: Active backlog

## Purpose

This ledger converts current "historical baggage" into an executable debt register:
- what the debt is,
- where the evidence lives,
- what compatibility cost it creates,
- and what to pay down first.

## Scoring Model

- Impact: `H/M/L` (release risk, regression risk, team velocity impact)
- Interest: `H/M/L` (cost growth if not fixed this cycle)
- Effort: `S/M/L` (engineering effort)
- Priority: `P0/P1/P2` (execution order)

---

## Debt Register

| ID | Debt Item | Evidence | Compatibility Cost | Impact | Interest | Effort | Priority |
|---|---|---|---|---|---|---|---|
| D-01 | Node runtime compatibility gap in frontend tests (mitigated) | Added `frontend/test/setup/storage-shim.ts` + `frontend/test/node-compatibility.test.ts`; Node policy codified via `.nvmrc` + `package.json engines`; CI `frontend-rewrite-gates.yml` now runs quality matrix on Node `24`/`25` | Residual cost is low: Node 25 still emits local warning on this machine, but test contract is now deterministic across supported versions | M | L | S | P0 |
| D-02 | `simulatorStore` remains a high-coupling "god module" | `frontend/src/stores/simulatorStore.ts` (~842 LOC), mixed concerns (UI state + scene IO + compatibility messaging + persistence) | Any behavior change has wide blast radius across desktop/phone/embed paths | H | H | M | P1 |
| D-03 | `DragDropManager` still concentrated despite extraction | `js/interactions/DragDropManager.js` (~1101 LOC), owns pointer lifecycle + context menu + pinch + geometry orchestration | Mobile/desktop pointer behavior remains expensive to evolve safely | H | H | M | P1 |
| D-04 | Runtime boundary still depends on broad legacy adapter surface | `frontend/src/engine/internal/legacyJsAdapter.ts`, `frontend/src/types/legacy-runtime.d.ts`, `frontend/src/runtime/simulatorRuntime.ts` | Legacy engine changes can leak into TS runtime with weak compile-time guarantees | M | H | M | P1 |
| D-05 | Scene hard-cut (`version: 2.0`) shifts burden to migration workflow | `docs/migration/scene-compatibility-policy.md`, `scripts/migrate-scene-v1-to-v2.mjs`, strict checks in `sceneSchema.ts` and `Serializer.js` | Historical data cannot be imported directly; ops/user must run migration first | M | M | S | P1 |
| D-06 | Responsive + safe-area CSS branching is large and regression-prone | `styles/main.css` and `styles/components.css` contain dense `layout-phone/tablet/desktop`, safe-area, orientation branches | Mobile UI changes can unintentionally affect tablet/desktop or short-landscape behavior | H | M | M | P1 |
| D-07 | E2E suite is powerful but expensive and brittle to UI contract shifts | `frontend/e2e/*.spec.ts` (~4k LOC), high churn in `core-path` and phone suites | Small UX refactors require broad test maintenance and snapshot churn | M | M | M | P2 |
| D-08 | Documentation timeline/governance drift risk | Presence of dated closure docs and governance tests (`test/docs_drift.test.js`, `test/documentation_governance.test.js`) | Mismatched docs can mislead release decisions and rollback ops | M | M | S | P2 |
| D-09 | Embed protocol hardening increases integration friction for old hosts | Strict target-origin behavior in `frontend/public/embed.js` and `docs/embed-protocol.md` | Integrations using wildcard origin must update host config/process | M | L | S | P2 |

---

## Compatibility Cost Summary

1. Data compatibility cost:
   - V1 scenes are rejected at runtime by design.
   - Cost is shifted from runtime complexity to migration operations (CLI + import guidance).

2. Toolchain compatibility cost:
   - Node runtime differences (notably Node 25 localStorage behavior) can invalidate frontend test assumptions.
   - Cost appears as CI/local inconsistency and noisy failure diagnosis.

3. Multi-device behavior compatibility cost:
   - One app shell supports desktop/tablet/phone with many conditional branches.
   - Cost appears as cross-layout regressions and larger E2E maintenance surface.

4. Integration compatibility cost:
   - Embed security defaults are stricter and safer.
   - Cost appears as host migration work for existing wildcard-origin integrations.

---

## Recommended Paydown Plan

### Week 1 (Stability Baseline)

1. P0: Fix Node compatibility gate
   - Pin supported Node version range in docs and CI.
   - Add CI matrix for at least Node 24 + 25.
   - In frontend tests, avoid direct assumptions on `window.localStorage` shape; provide explicit storage test shim when missing methods.

2. P1: `simulatorStore` split (phase 1)
   - Extract scene IO actions into `sceneIoStore` or `useSceneIoActions`.
   - Extract markdown/classroom/phone-density persistence into `uiPreferencesStore`.
   - Keep runtime orchestration in current store for this phase.

3. P1: `DragDropManager` split (phase 1)
   - Move context menu lifecycle and pointer gesture orchestration into dedicated modules with explicit contracts.
   - Keep manager as coordinator only.

### Week 2 (Complexity Reduction)

1. P1: Runtime boundary tightening
   - Shrink `legacyJsAdapter` export surface to only runtime-required symbols.
   - Replace broad `RuntimeRecord` style declarations with narrower interfaces for used APIs.

2. P1: Responsive style modularization
   - Split phone/tablet/desktop-specific rules into separate files.
   - Add style-contract tests for critical safe-area/layout invariants.

3. P2: E2E maintenance efficiency
   - Introduce shared interaction helpers for repeated phone flows.
   - Minimize screenshot baseline dependence for non-visual behavior checks.

---

## Execution Guardrails

- Every debt paydown PR must include:
  - one measurable complexity delta (LOC, module boundary, or coupling reduction),
  - at least one regression guard test,
  - docs update in `docs/README.md` and relevant migration/release docs.
- No new user feature scope until `D-01`, `D-02`, and `D-03` are moved to "mitigated".

## Mitigation Updates

`[D-01] mitigated - 2026-03-03 - Added frontend localStorage compatibility shim + node policy guards + CI Node 24/25 quality matrix - Evidence: npm run test:frontend (192 passed), npm run lint:frontend, npm run typecheck:frontend, npm test`

## Status Template

Use this per debt item in follow-up updates:

`[ID] <state: open|mitigated|closed> - <date> - <change summary> - <verification evidence>`
