# 2026-03-17 Tech Debt Round 2 Closure Report

## Scope

Round 2 focused on reducing release risk, runtime complexity, and documentation drift across deploy contracts, scene compatibility, interaction/renderer decomposition, E2E structure, TS boundary typing, and doc governance.

Execution branch: `codex/tech-debt-round2-exec`

## Delivered Tasks

1. Deploy contract hardening (`ef7a709`)
   - Docker/Vercel contract aligned to `frontend/dist` build artifacts.
   - Added deploy contract test guard.

2. Scene migration CLI + policy (`11cd0ae`)
   - Added `migrate-scene-v1-to-v2` CLI and contract tests.
   - Added migration policy documentation.

3. Import migration guidance (`42ad638`, `49ceffc`)
   - Store and tests aligned on explicit non-v2 rejection guidance.
   - Message includes migration hint (`migrate:scene-v1-v2`).

4. DragDropManager pointer lifecycle extraction (`0dc37ae`)
   - Separated pointer lifecycle state transitions and added contract coverage.

5. DragDropManager geometry/tangency extraction (`16879c7`)
   - Isolated geometry interaction/tangency orchestration with dedicated tests.

6. Renderer split (`1a93ccd`)
   - Field/device rendering moved into dedicated modules.
   - Renderer retained orchestration responsibilities.

7. Phone E2E decomposition and baseURL normalization (`bdbe75e`)
   - Split phone-only scenarios into dedicated specs.
   - Removed hard-coded host/port coupling in E2E suite and stabilized Playwright server binding.

8. Type boundary tightening (`e5656f3`)
   - Expanded `legacy-runtime.d.ts` bridge declarations to match actual runtime usage.
   - Removed unsafe `as unknown as` casts in key frontend tests.

9. Docs drift guard and sync (`b0a20db`)
   - Added `test/docs_drift.test.js`.
   - Synced QUICKSTART schema contract, hard-cut plan status, and docs index entry.

## Verification Evidence

Latest full-chain verification run (2026-03-03):

- `npm run quality:all` passed.
  - `npm run lint:frontend` passed.
  - `npm run typecheck:frontend` passed.
  - `npm test` passed (`178` passed, `0` failed).
  - `npm run test:frontend` passed (`38` files, `190` tests).
  - `npm run test:e2e` passed (`98` passed, `0` failed).

Task 10 final rerun (2026-03-03) also passed with the same command set:

- `npm run lint:frontend`
- `npm run typecheck:frontend`
- `npm test`
- `npm run test:frontend`
- `npm run test:e2e`

## Residual Risks

- Local toolchain note: Homebrew `node@25` on this machine may fail to start due to `libsimdjson` dylib mismatch; verification was executed with `node@24` in `PATH`.
- Long-term maintainability still depends on continuing to retire legacy runtime coupling behind adapter boundaries.

## Follow-up Recommendations

1. Keep `test/docs_drift.test.js` and `test/deploy_contract.test.js` in mandatory CI gate.
2. Add CI matrix entry that validates E2E against isolated Playwright web server ports.
3. Schedule Round 3 targeting remaining runtime boundary simplification and ops automation.
