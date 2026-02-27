# Responsive and Touch Experience Redesign

Date: 2026-02-27  
Status: Validated with stakeholder

## 1. Goal and Scope

The project needs a full audit-driven redesign to strengthen:

1. Dynamic responsive behavior across desktop, tablet, and phone viewports.
2. Touch-first interaction quality (placement, edit, object operations, gesture consistency).
3. UI readability and operability at narrow widths without changing simulation correctness.

In scope:
- Shell/layout architecture redesign.
- Interaction model and input adaptation redesign.
- Component-level responsive and touch behavior standards.
- Error handling and test/acceptance strategy for the new UX.

Out of scope for this design:
- Physics model changes.
- Scene schema changes.
- New simulation object categories.

## 2. Current-State Audit Summary

### 2.1 Strengths

- Runtime architecture is clean: Vue shell -> store -> `SimulatorRuntime` -> engine.
- Pointer events are already supported in `DragDropManager`.
- Coarse pointer path exists for tool arming + canvas placement.
- Long-press property opening on touch is implemented.
- Renderer already adapts canvas size with DPR and responsive particle metrics.
- Existing test baseline is stable:
  - `npm test`: 84/84 pass
  - `npm run test:frontend`: 53/53 pass
  - `npm run test:e2e -- frontend/e2e/core-path.spec.ts`: pass

### 2.2 High-priority gaps

1. Mobile toolbar utility degrades at narrow widths:
   - Tool labels are hidden, but preset buttons keep long text and become cramped.
2. Touch object action loop is incomplete:
   - Copy/delete are mainly in context-menu path (desktop right-click idiom).
3. Demo zoom interaction is wheel-centric:
   - No native two-finger pinch zoom path.
4. Floating Markdown board lacks mobile-specific behavior strategy:
   - Fixed absolute base size/position can occlude canvas on phones.
5. Touch target size and action density are too compact in header for small screens.
6. E2E coverage is desktop-only and misses touch-device regression detection.

### 2.3 Visual audit artifacts

Representative screenshots captured during audit:

- Desktop: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/output/audit-desktop-1920x1080.png`
- Tablet: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/output/audit-tablet-1024x768.png`
- Phone: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/output/audit-mobile-390x844.png`
- Touch placement flow: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/output/mobile-audit-after-place.png`
- Touch long-press property open: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/output/mobile-audit-longpress.png`

## 3. Alternatives and Decision

### Option A (Recommended): Adaptive Shell Refactor

Keep one runtime and one data model. Introduce multi-mode shell layouts (`desktop`, `tablet`, `phone`) and a touch-focused interaction layer.

Pros:
- Highest UX improvement for moderate complexity.
- No engine fork; low behavioral drift risk.
- Incremental rollout possible.

Cons:
- Requires coordinated refactor across shell components and CSS architecture.

### Option B: CSS-only Patching

Only tune breakpoints and sizes, keep interaction model mostly unchanged.

Pros:
- Fastest delivery.

Cons:
- Cannot solve touch action completeness and gesture gaps.

### Option C: Separate Mobile App Shell

Build independent mobile shell path.

Pros:
- Maximum mobile customization.

Cons:
- High long-term maintenance and parity burden.

### Decision

Choose **Option A**.

## 4. Target Architecture

Adopt a **single runtime, multi-shell UI** architecture.

### 4.1 Layout modes

`layoutMode` computed by viewport + media query:
- `desktop`: width >= 1200
- `tablet`: 768 <= width < 1200
- `phone`: width < 768

### 4.2 Shell components

Split app shell into focused containers:

1. `TopControlBar`
- Core playback and mode operations.
- Key numeric controls only in phone mode.

2. `ToolRail`
- Desktop: full left rail with labels.
- Tablet/phone: icon-prioritized compact rail or bottom-entry launcher.

3. `DrawerHost`
- Unified host for property panel, variables panel, markdown board.
- Desktop: side drawer.
- Phone: bottom sheet.

4. `StatusStrip`
- Stable lightweight footer/status output.

`App.vue` becomes an orchestration shell, reducing direct coupling to layout details.

## 5. Interaction Model (Touch-centered)

### 5.1 Placement flow

- Tap tool -> tool is armed.
- Tap canvas blank -> place object.
- Tap same tool again -> disarm.
- Optional "continuous placement" toggle for repetitive construction on touch.

### 5.2 Object operation completeness

Touch path must support full lifecycle without right-click:

- Select object -> show compact object action strip (Properties / Duplicate / Delete).
- Long press object -> open properties.
- Desktop right-click menu remains supported; touch gets equivalent explicit controls.

### 5.3 Gesture model

- Single finger: select, drag object.
- Single finger on empty canvas: pan canvas.
- Two fingers: pan/zoom canvas in demo mode (pinch + focal anchor semantics).
- Conflict resolution priority: object drag > canvas pan for single touch; two-finger gesture overrides single-touch interactions.

## 6. State and Data Flow

Maintain strict intent-based flow:

UI intent -> store action -> runtime/input adapter -> scene mutation -> render -> snapshot -> reactive UI update

### 6.1 New `uiShell` state domain

Inside `simulatorStore`, add UI-only state such as:
- `layoutMode`
- `activeDrawer`
- `activeToolType`
- `placementMode`
- `touchHintVisible`

Runtime-derived simulation state remains source-of-truth for simulation behavior.

### 6.2 Input adaptation boundary

Introduce an `InputAdapter` layer that translates raw pointer/touch streams into semantic commands:
- `select`
- `move`
- `resize`
- `pan`
- `zoom`
- `place`

This prevents gesture logic from leaking into shell components and keeps extension points clear.

## 7. Error Handling and UX Fallbacks

Design principle: recoverable failures should not break simulation loop.

1. Gesture interruption (`pointercancel`, pointer loss):
- Reset interaction state only; keep scene intact.

2. Drawer/action failures:
- Show `status + toast` with retry guidance.
- Do not force-close valid draft data.

3. Delete safety on touch:
- Add confirmation guard for destructive delete from touch action strip.

4. Layout fallback:
- If mode detection fails, fallback to `tablet` shell as safe baseline.

5. Interaction ambiguity:
- Deterministic precedence rules (documented) to avoid unpredictable behavior.

## 8. Responsive and Touch UI Standards

1. Touch targets:
- Minimum interactive size: 44x44 CSS px.

2. Density strategy:
- Phone mode uses progressive disclosure (primary actions visible, secondary in drawer/sheet).

3. Typography and spacing:
- Reduce horizontal crowding before shrinking font.
- Keep critical numeric controls legible at narrow widths.

4. Floating overlays:
- Markdown board defaults to drawer/sheet on phone.
- Free-floating draggable board reserved for larger layouts.

5. Overflow policy:
- Avoid hidden critical actions inside uncontrolled horizontal scrollers.

## 9. Testing Strategy

### 9.1 Unit tests

- `layoutMode` classification.
- `uiShell` state transitions.
- Gesture-to-command mapping and conflict arbitration.

### 9.2 Component tests

- Desktop/tablet/phone shell rendering contracts.
- DrawerHost behavior across modes.
- Touch target sizing assertions for critical controls.

### 9.3 E2E matrix

Expand Playwright projects:
- Desktop Chrome
- iPad profile
- iPhone profile

Cover critical touch flows:
1. Tap tool -> tap canvas placement.
2. Long press object -> properties.
3. Object action strip duplicate/delete.
4. Two-finger pan/zoom in demo mode.
5. Drawer edit/apply persistence.

## 10. Acceptance Criteria

1. At 390px width, no critical control is blocked or unusable.
2. Touch can complete create/edit/duplicate/delete loop without right-click.
3. Demo mode supports two-finger pan and zoom.
4. Drawer behaviors are mode-consistent (desktop side drawer, phone bottom sheet).
5. E2E passes on desktop/tablet/phone profiles.
6. No simulation regression in existing test suites.

## 11. Implementation Notes for Next Step

Recommended sequencing:

1. Introduce `layoutMode` and shell component split.
2. Add `DrawerHost` unification and phone bottom-sheet behavior.
3. Implement touch object action strip and duplicate/delete path.
4. Add two-finger gesture support in input layer.
5. Add responsive/touch E2E projects and tests.
6. Tune style tokens and touch target sizes.

## 12. Immediate Next Action

Design is validated. Ready to create implementation plan and start isolated feature execution.
