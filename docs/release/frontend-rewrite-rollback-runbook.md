# Frontend Rewrite Rollback Runbook

Date: 2026-02-12
Owner: Frontend platform team

## Trigger Conditions

Initiate rollback immediately when any of the following happens after release:
- `P0`: core path unavailable (cannot create/edit/play/import/export/demo mode).
- `P1`: severe data regression impacting active users.
- Replay or performance gate results diverge from release baseline.

## Preconditions

- Previous stable artifact tag is available and deployable.
- Release operators have production deployment permissions.
- Incident channel is open and ownership is assigned.
- Build artifacts are available from `frontend/dist` (do not deploy raw source tree).
- Team confirms V3 scene hard-cut contract (`version: "3.0"` only) before traffic restore.

## Rollback Procedure

1. Announce incident scope and freeze new frontend deployments.
2. Route traffic back to the previous stable artifact tag.
3. Validate critical endpoints and static asset integrity (`index.html` / `viewer.html` / `embed.js` from built artifact).
4. Execute smoke checks on core-path flows.
5. If schema integrity risk exists:
   - Freeze new-write paths until validated.
   - Reject non-`3.0` payloads; do not introduce ad-hoc compatibility bypasses during incident response.
6. Confirm user-facing recovery in monitoring dashboards.

## Data Safety Rules

- Never run schema migration scripts during rollback unless explicitly approved.
- Preserve raw incident payloads for replay analysis.
- If payload integrity is uncertain, prefer read-only fallback over partial writes.
- Never bypass `3.0` scene gate by hot-patching runtime validators in production.
- Never re-open legacy compatibility path as an emergency workaround.

## Verification Checklist

- [ ] Core-path UI loads for all supported browsers.
- [ ] Create/edit/play flow operates without errors.
- [ ] Import/export and local save/load are functional.
- [ ] Demo mode enter/exit restores expected state.
- [ ] Golden-scene replay signature is within expected tolerance.
- [ ] Performance budget remains within threshold.

## Exit Criteria

Rollback incident can be closed only when:
- Traffic fully stabilized on previous version.
- No active P0/P1 alerts remain.
- Hotfix plan is documented with owner and ETA.

## Post-Incident Actions

- Archive traces and logs under `output/playwright/` and incident storage.
- Create root-cause analysis with prevention actions.
- Re-run full quality gates before any re-release.
