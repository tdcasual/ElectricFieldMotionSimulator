# UI Refresh Baseline

## Scope

This document freezes the UI baseline before the 2026-03-14 shell refresh so desktop, tablet, phone, and theme changes can be reviewed against an agreed contract instead of memory.

## Baseline Issues

- Desktop header is functionally rich but visually overloaded.
- Empty canvas state relies on a small hint in the toolbar instead of in-stage onboarding.
- Light theme reads as a generic utility app while dark theme already suggests an instrument panel.
- Phone shell is usable, but visual hierarchy between status, nav, and sheets is still flatter than the product positioning suggests.

## Verification Anchors

- `frontend/test/app-shell.test.ts`
- `frontend/test/canvas-viewport.test.ts`
- `frontend/e2e/responsive-visual.spec.ts`

## Expected Before/After Review Questions

- Can a first-time user understand the first step without scanning the toolbar?
- Does the header communicate mode, state, and priority actions without horizontal overflow?
- Do phone sheets feel like one coherent system instead of independent panels?
- Do light and dark themes feel like the same product?

## After Refresh

The refresh is now locked against a new “field lab” shell baseline:

- Desktop header is split into brand, mode strip, grouped primary actions, teaching actions, and compact scene settings instead of one dense control row.
- Empty canvas now carries an in-stage onboarding card that points users toward the toolbar, presets, and quick-start actions.
- Light and dark themes both use the same instrument-panel language, with shell, stage, status, and teaching accents mapped through semantic tokens.
- Phone status, bottom navigation, and sheet subtitles now read as one system rather than separate layers.

## Refreshed Visual Baseline

The canonical screenshot set after the refresh is:

- `responsive-phone-390x844-desktop-chromium-darwin.png`
- `responsive-phone-landscape-744x390-desktop-chromium-darwin.png`
- `responsive-tablet-768x1024-desktop-chromium-darwin.png`
- `responsive-desktop-1920x1080-desktop-chromium-darwin.png`
- `responsive-desktop-dark-1920x1080-desktop-chromium-darwin.png`

## Verification Result

Fresh verification for the refreshed shell was completed on 2026-03-14 with:

- `npm run lint:frontend`
- `npm run typecheck:frontend`
- `npm run test:frontend`
- `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- frontend/e2e/core-path.spec.ts frontend/e2e/touch-core-path.spec.ts frontend/e2e/responsive-visual.spec.ts`

During verification, `responsive-visual.spec.ts` was intentionally re-baselined with:

```bash
PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- frontend/e2e/responsive-visual.spec.ts --update-snapshots
```
