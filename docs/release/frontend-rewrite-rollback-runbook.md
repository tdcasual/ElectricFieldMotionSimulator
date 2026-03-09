# Frontend Rewrite Rollback Runbook

Date: 2026-03-08
Owner: Frontend platform team

## Trigger Conditions

Initiate rollback immediately when any of the following happens after release:

- `P0`: core path unavailable (cannot create/edit/play/import/export/demo mode).
- `P1`: severe data/compatibility regression impacting active users.
- Bundle, browser-performance, or interaction results diverge materially from the release baseline.
- `release:gate` can no longer be reproduced against the release candidate artifact.

## Preconditions

- Previous stable artifact tag is available and deployable.
- Release operators have production deployment permissions.
- Incident channel is open and ownership is assigned.
- Latest verification matrix is available: `docs/release/2026-03-08-optimization-verification-matrix.md`.

## Fast Classification

| Symptom | First confirmation | First rollback target |
| --- | --- | --- |
| Bundle split / startup regression | `npm run build:frontend && npm run verify:budgets` | `frontend/vite.config.ts` chunking changes or previous stable artifact |
| Browser render / FPS / long-task regression | `npm run verify:profiles:budgets` | `js/objects/Particle.js` trajectory sampling changes + `js/objects/ElectronGun.js` emitted display-flag propagation |
| Desktop/phone interaction regression | `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e:phone` and `npm run test:smoke` | `js/interactions/LongPressController.js`, `js/interactions/PointerGestureState.js`, `frontend/src/session/authoringSession.ts`, `frontend/src/session/authoringSessionTransitions.ts` |
| Runtime snapshot / authoring bridge regression | `npm run test:frontend:regression` | `frontend/src/runtime/*`, `frontend/src/stores/simulatorStore.ts`, `frontend/src/embed/*` |

## Rollback Procedure

1. Announce incident scope and freeze new frontend deployments.
2. Prefer full artifact rollback to the previous stable tag when user-facing impact is broad.
3. If impact is isolated and time-critical, revert the smallest validated rollback target from the table above.
4. Rebuild and re-run the minimal proving command for that symptom.
5. Route traffic back to the previous stable artifact tag if targeted rollback does not clear the issue quickly.
6. Validate critical endpoints and static asset integrity.
7. Execute smoke checks on core-path flows.
8. Confirm user-facing recovery in monitoring dashboards.

## Targeted Rollback Guidance

### Bundle / startup regressions

Rollback priority:

1. Revert `frontend/vite.config.ts` chunk split strategy.
2. Redeploy the last-known-good static asset set.
3. Re-run `npm run build:frontend`, `npm run verify:budgets`, `npm run test:smoke`.

### Browser performance regressions

Rollback priority:

1. Revert `js/objects/Particle.js` trajectory point compaction if the regression aligns with trajectory-heavy scenes.
2. Revert `js/objects/ElectronGun.js` emitted-particle display flag propagation if overlay cost unexpectedly explodes.
3. Re-run `npm run verify:profiles:budgets` and `npm run profile:browser-render`.

### Interaction regressions

Rollback priority:

1. Revert `js/interactions/LongPressController.js` / `js/interactions/PointerGestureState.js` when the symptom is touch timing, jitter tolerance, or gesture chain reset.
2. Revert `frontend/src/session/authoringSession.ts` / `frontend/src/session/authoringSessionTransitions.ts` when the symptom is drawer state, selected sheet restoration, or authoring UI flow.
3. Re-run `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e:phone` and `npm run test:smoke`.

## Data Safety Rules

- Never run schema migration scripts during rollback unless explicitly approved.
- Preserve raw incident payloads for replay analysis.
- If compatibility is uncertain, prefer read-only fallback over partial writes.

## Verification Checklist

- [ ] `npm run test:smoke` passes against the rollback artifact.
- [ ] `npm run test:engine:regression` passes if engine/runtime files changed.
- [ ] `npm run test:frontend:regression` passes if frontend/store/embed files changed.
- [ ] `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e:phone` passes if touch paths were implicated.
- [ ] `npm run verify:profiles:budgets` passes if performance was implicated.
- [ ] Monitoring confirms error rate and user-visible latency returned to baseline.

## Exit Criteria

Rollback incident can be closed only when:

- Traffic fully stabilized on previous version or validated hotfix.
- No active P0/P1 alerts remain.
- Hotfix plan is documented with owner and ETA.
- Re-entry criteria reference the verification matrix and required gates.

## Post-Incident Actions

- Archive traces and logs under `output/playwright/` and incident storage.
- Create root-cause analysis with prevention actions.
- Re-run full `PLAYWRIGHT_VITE_PORT=4499 npm run release:gate` before any re-release.
