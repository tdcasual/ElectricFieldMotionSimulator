# Tangency Hint & Snap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real-time tangency detection, visual hinting, and snapping for circle-to-circle and circle-to-line boundary placement during drag/resize.

**Architecture:** Keep geometry computation pure and testable in a new tangency utility module. Integrate the utility into `DragDropManager` pointer/mouse move loops to update runtime interaction state and apply snap positions. Render transient hint overlays in `Renderer` using `scene.interaction.tangencyHint`.

**Tech Stack:** Vanilla JavaScript (ES modules), Node built-in test runner (`node --test`), existing canvas renderer.

---

### Task 1: Add failing geometry tests for tangency matching

**Files:**
- Create: `test/tangency_geometry.test.js`
- Modify: `package.json` (no change expected, existing script already covers `test/*.test.js`)

**Step 1: Write the failing test**

Add tests that import a new module `js/interactions/TangencyEngine.js` and assert:
1. circle-circle outer tangency within tolerance is matched
2. circle-circle inner tangency within tolerance is matched
3. circle-line tangency within tolerance is matched
4. best match selection prefers lower error and then lower movement
5. modifier suppression input is not handled in pure geometry (integration concern)

**Step 2: Run test to verify it fails**

Run: `npm test -- test/tangency_geometry.test.js`
Expected: FAIL with module/function not found.

**Step 3: Commit**

Do not commit yet; continue until implementation and green tests.

### Task 2: Implement minimal tangency geometry engine

**Files:**
- Create: `js/interactions/TangencyEngine.js`
- Test: `test/tangency_geometry.test.js`

**Step 1: Write minimal implementation**

Implement pure helpers:
1. `distancePointToSegment(...)`
2. `evaluateCircleCircleTangency(activeCircle, candidateCircle, tolerance)`
3. `evaluateCircleSegmentTangency(activeCircle, candidateSegment, tolerance)`
4. `pickBestTangencyMatch(matches)`
5. `computeTangencyMatch(activeCircle, candidates, tolerance)`

Each match should include relation type, error, and snap target payload sufficient for drag/resize integration.

**Step 2: Run test to verify it passes**

Run: `npm test -- test/tangency_geometry.test.js`
Expected: PASS.

**Step 3: Refactor**

Keep API minimal and data contracts explicit (`kind`, `errorPx`, `snapTarget`, `candidateRef`).

### Task 3: Add failing integration tests for drag-level tangency workflow

**Files:**
- Modify: `test/dragdrop_helpers.test.js`
- Modify: `js/interactions/DragDropManager.js` (export small pure helpers if needed)

**Step 1: Write the failing test**

Add tests for helper functions (exported for testability) that:
1. build boundary candidates for circle/rect/triangle/line-like objects
2. clear hint state on interaction end
3. return no match for non-circle active object

**Step 2: Run test to verify it fails**

Run: `npm test -- test/dragdrop_helpers.test.js`
Expected: FAIL with missing exports or mismatched behavior.

### Task 4: Integrate tangency into drag/resize runtime

**Files:**
- Modify: `js/interactions/DragDropManager.js`
- Modify: `js/core/Scene.js` (initialize/clear interaction runtime container safely)
- Modify: `js/core/PhysicsEngine.js` (optional: export/shared geometry helper only if needed; avoid if possible)

**Step 1: Write minimal implementation**

In `DragDropManager`:
1. add helper methods:
   - `getTangencyActiveCircle(object, mode, resizeStart)`
   - `collectTangencyCandidates(activeObject)`
   - `updateTangencyHintAndSnap(pos, keyboardState)`
   - `clearTangencyHint()`
2. call update method in both `onPointerMove` and `onMouseMove` for move + resize paths
3. apply snap when match exists and `!event.altKey`
4. preserve existing drag/resize semantics for particles and non-circle fields
5. clear hint state on `onPointerUp`, `onMouseUp`, and when dragging is canceled

In `Scene`:
1. ensure `scene.interaction` object exists
2. ensure `clear()` resets runtime interaction state
3. keep `serialize()`/`loadFromData()` unchanged regarding hint persistence

**Step 2: Run targeted tests**

Run: `npm test -- test/dragdrop_helpers.test.js test/tangency_geometry.test.js`
Expected: PASS.

### Task 5: Add renderer overlay for tangency hints

**Files:**
- Modify: `js/core/Renderer.js`
- Test: `test/renderer_registry.test.js` (or create focused renderer helper test if practical)

**Step 1: Write the failing test**

If a pure helper is extracted for draw options, test it; otherwise skip direct canvas assertion and rely on integration/manual verification + no regression tests.

**Step 2: Implement minimal drawing**

Add `drawTangencyHint(scene)` invoked from `renderFields(scene)` after object rendering and before field vectors:
1. highlight active circle boundary
2. highlight candidate boundary (circle or segment)
3. draw badge text (`相切`, `外切/内切`, `Alt可取消吸附`)

Guard against invalid coordinates and missing context.

**Step 3: Verify no regressions**

Run: `npm test -- test/renderer_registry.test.js test/tangency_geometry.test.js test/dragdrop_helpers.test.js`
Expected: PASS.

### Task 6: Full verification and commit

**Files:**
- Modify: `js/interactions/DragDropManager.js`
- Modify: `js/interactions/TangencyEngine.js`
- Modify: `js/core/Renderer.js`
- Modify: `js/core/Scene.js`
- Create/Modify tests under `test/`

**Step 1: Run full automated tests**

Run: `npm test`
Expected: all pass, 0 failures.

**Step 2: Manual smoke check**

Run app and verify:
1. circle-circle outer/inner tangency hints
2. circle-line/rect-edge/triangle-edge tangency hints
3. drag + resize trigger
4. `Alt/Option` suppresses snap
5. hints clear on release

**Step 3: Commit**

```bash
git add js/interactions/DragDropManager.js js/interactions/TangencyEngine.js js/core/Renderer.js js/core/Scene.js test/tangency_geometry.test.js test/dragdrop_helpers.test.js
git commit -m "feat: add tangency hints and snapping for circular boundaries"
```
