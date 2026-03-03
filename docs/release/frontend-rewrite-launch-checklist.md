# Frontend Rewrite Launch Checklist

Date: 2026-02-12
Last Reviewed: 2026-03-03 (V3 hard-clean baseline)

## Pre-Launch Gates

- [x] `npm run lint:frontend` passes. (`DONE`, verified 2026-03-03)
- [x] `npm run typecheck:frontend` passes. (`DONE`, verified 2026-03-03)
- [x] `npm run test:frontend` passes. (`DONE`, verified 2026-03-03)
- [x] `npm run test:e2e` passes. (`DONE`, verified 2026-03-03)
- [x] `npm run quality:all` passes. (`DONE`, verified 2026-03-03)
- [x] Deploy contract guard passes (`frontend/test/v3-deploy-contract.test.ts`). (`DONE`, verified 2026-03-03)
- [x] Docs governance guard passes (`frontend/test/v3-doc-governance.test.ts`). (`DONE`, verified 2026-03-03)
- [x] Frontend bundle build succeeds (`npm run build:frontend`). (`DONE`, verified 2026-03-03)

## Core-Path Validation

- [x] Object creation is functional. (`DONE`, verified 2026-03-03)
- [x] Property editing applies changes correctly. (`DONE`, verified 2026-03-03)
- [x] Play/Pause and timestep controls are correct. (`DONE`, verified 2026-03-03)
- [x] Scene import/export round-trip is valid. (`DONE`, verified 2026-03-03)
- [x] Embed command roundtrip succeeds. (`DONE`, verified 2026-03-03)

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
