# Frontend Rewrite Launch Checklist

Date: 2026-03-08

## Pre-Launch Gates

- [ ] `npm run test:smoke` passes.
- [ ] `npm run test:engine:regression` passes.
- [ ] `npm run test:frontend:regression` passes.
- [ ] `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e:phone` passes when touch/phone changes are included.
- [ ] `npm run build:frontend` passes.
- [ ] `npm run verify:budgets` passes.
- [ ] `npm run verify:profiles:contracts` passes.
- [ ] `npm run verify:profiles:budgets` passes.
- [ ] `PLAYWRIGHT_VITE_PORT=4499 npm run release:gate` passes.

## Core-Path Validation

- [ ] Object creation is functional.
- [ ] Property editing applies changes correctly.
- [ ] Play/Pause and timestep controls are correct.
- [ ] Scene import/export round-trip is valid.
- [ ] Demo mode enter/exit preserves expected state.
- [ ] Embed host ready/command flow still works.
- [ ] Phone bottom-sheet flows remain usable on touch devices.

## Operational Readiness

- [ ] Verification matrix reviewed: `docs/release/2026-03-08-optimization-verification-matrix.md`.
- [ ] Rollback runbook reviewed: `docs/release/frontend-rewrite-rollback-runbook.md`.
- [ ] Last-known-good artifact tag documented.
- [ ] Incident owner and on-call contacts confirmed.
- [ ] Rollback dry-run completed or explicitly waived.

## Launch Decision

- [ ] Go / No-Go decision documented.
- [ ] Release notes published.
- [ ] Monitoring dashboards watched for first 60 minutes.
- [ ] Any waiver on `verify:budgets:target` is documented with owner and expiry.
