# Frontend Rewrite Launch Checklist

Date: 2026-02-12

## Pre-Launch Gates

- [ ] `npm run lint:frontend` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:frontend` passes.
- [ ] `npm run test:e2e` passes.
- [ ] Replay consistency checks pass for golden-scene fixtures.
- [ ] Performance gate `test/perf_budget.test.js` passes.

## Core-Path Validation

- [ ] Object creation is functional.
- [ ] Property editing applies changes correctly.
- [ ] Play/Pause and timestep controls are correct.
- [ ] Scene import/export round-trip is valid.
- [ ] Demo mode enter/exit preserves expected state.

## Operational Readiness

- [ ] Rollback runbook reviewed: `docs/release/frontend-rewrite-rollback-runbook.md`.
- [ ] Last-known-good artifact tag documented.
- [ ] Incident owner and on-call contacts confirmed.
- [ ] Rollback dry-run completed.

## Launch Decision

- [ ] Go / No-Go decision documented.
- [ ] Release notes published.
- [ ] Monitoring dashboards watched for first 60 minutes.
