# Frontend Rewrite Launch Checklist

Date: 2026-02-12
Last Reviewed: 2026-03-03 (Round 2 closure)

## Pre-Launch Gates

- [x] `npm run lint:frontend` passes. (`DONE`, verified 2026-03-03)
- [x] `npm run typecheck:frontend` passes. (`DONE`, verified 2026-03-03)
- [x] `npm test` passes. (`DONE`, verified 2026-03-03)
- [x] `npm run test:frontend` passes. (`DONE`, verified 2026-03-03)
- [x] `npm run test:e2e` passes. (`DONE`, verified 2026-03-03)
- [x] Replay consistency checks pass for golden-scene fixtures. (`DONE`, verified 2026-03-03)
- [x] Performance gate `test/perf_budget.test.js` passes. (`DONE`, verified 2026-03-03)
- [x] Deploy contract guard passes (`npm test -- test/deploy_contract.test.js`). (`DONE`, verified 2026-03-03)
- [x] Docs drift guard passes (`npm test -- test/docs_drift.test.js`). (`DONE`, verified 2026-03-03)

## Core-Path Validation

- [x] Object creation is functional. (`DONE`, verified 2026-03-03)
- [x] Property editing applies changes correctly. (`DONE`, verified 2026-03-03)
- [x] Play/Pause and timestep controls are correct. (`DONE`, verified 2026-03-03)
- [x] Scene import/export round-trip is valid. (`DONE`, verified 2026-03-03)
- [x] Demo mode enter/exit preserves expected state. (`DONE`, verified 2026-03-03)

## Operational Readiness

- [x] Rollback runbook reviewed: `docs/release/frontend-rewrite-rollback-runbook.md`. (`DONE`, 2026-03-03)
- [x] V3 scene contract hard-cut policy reviewed (`version: "3.0"` only). (`DONE`, verified 2026-03-03)
- [x] Last-known-good artifact tag documented. (`N/A` for local desktop workflow; use git SHA)
- [x] Incident owner and on-call contacts confirmed. (`N/A` for local desktop workflow)
- [x] Rollback dry-run completed. (`N/A` for local desktop workflow)

## Launch Decision

- [x] Go / No-Go decision documented. (`DONE`, 2026-03-03)
- [x] Release notes published. (`N/A` for in-repo iterative delivery)
- [x] Monitoring dashboards watched for first 60 minutes. (`N/A` for in-repo iterative delivery)
