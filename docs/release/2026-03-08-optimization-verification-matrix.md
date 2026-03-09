# 2026-03-08 Optimization Verification Matrix

## Purpose

This matrix turns the current optimization work into repeatable verification rules, so release decisions do not depend on memory.

## Matrix

| Change category | Must-run commands | Optional sampling | Main risk | Rollback entry |
| --- | --- | --- | --- | --- |
| Engine / object / serialization | `npm run test:engine:regression` | `npm run profile:high-emission` | physics drift, object defaults break, save/load incompatibility | `docs/release/frontend-rewrite-rollback-runbook.md` → runtime / performance rows |
| Frontend runtime / store / embed bridge | `npm run test:frontend:regression` | `npm run test:smoke` | snapshot drift, panel state mismatch, embed bootstrap failure | `docs/release/frontend-rewrite-rollback-runbook.md` → runtime snapshot / authoring bridge |
| Phone / touch / bottom-sheet interaction | `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e:phone` | `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- --project=tablet-chromium frontend/e2e/touch-core-path.spec.ts` | long-press/pinch regressions, selected-sheet flow breaks, touch targets regress | `docs/release/frontend-rewrite-rollback-runbook.md` → interaction regressions |
| Bundle / build / packaging | `npm run build:frontend` and `npm run verify:budgets` | `npm run verify:budgets:target` | startup slowdown, oversized chunks, deploy artifact mismatch | `docs/release/frontend-rewrite-rollback-runbook.md` → bundle / startup regressions |
| Profile contract / performance budgets | `npm run verify:profiles:contracts` and `npm run verify:profiles:budgets` | `npm run profile:browser-render`, `npm run profile:expressions`, `npm run profile:browser-expressions` | FPS drop, long tasks, trajectory explosion, silent report drift | `docs/release/frontend-rewrite-rollback-runbook.md` → browser performance regressions |
| Release candidate / pre-launch | `PLAYWRIGHT_VITE_PORT=4499 npm run release:gate` | `PLAYWRIGHT_VITE_PORT=4499 npm run quality:all` | partial verification leaves regressions undetected | full artifact rollback to last-known-good tag |

## Notes

- `npm run test:smoke` is the fastest desktop confidence check and should be the first command after a targeted rollback.
- `test.skip` inside `frontend/e2e/touch-core-path.spec.ts` is intentional project routing:
  - tablet keeps shared touch-layout checks
  - phone runs the phone-only gesture assertions
- `npm run quality:release` remains available as an alias to `npm run release:gate` for existing CI or operator habits.
- Baseline comparison reference: `docs/release/2026-03-08-optimization-baseline.md`.
