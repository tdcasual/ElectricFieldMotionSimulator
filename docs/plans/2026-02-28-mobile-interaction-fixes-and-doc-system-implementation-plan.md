# Mobile Interaction Fixes And Documentation System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the confirmed mobile interaction bugs (sheet swipe-close robustness and touch target accessibility) and establish a unified, maintainable documentation system for the whole project.

**Architecture:** Keep runtime behavior changes minimal and localized. Implement swipe-close robustness in the shared gesture utility so all phone sheets inherit the fix consistently. Enforce touch-target constraints through existing phone density CSS tokens and verify via phone E2E assertions. Build a docs system around a single docs index, ownership rules, and update protocol, then wire top-level entry docs to that index.

**Tech Stack:** Vue 3 + TypeScript, Vitest, Playwright, CSS tokens, Markdown docs.

---

### Task 1: Add failing tests for mobile regressions

**Files:**
- Modify: `frontend/test/swipe-close-gesture.test.ts`
- Modify: `frontend/e2e/touch-core-path.spec.ts`

**Step 1: Write failing test for swipe close when pointerup happens outside sheet header**
- Add a unit test that starts swipe on header target, dispatches `pointerup` on `document`, and expects close callback.

**Step 2: Write failing E2E assertions for touch target minimums in phone landscape and property panel**
- Add/upgrade assertions to enforce `>=44px` for:
  - phone bottom nav play button (landscape)
  - phone more-sheet save button (landscape)
  - property drawer section toggle and value input in phone mode

**Step 3: Run targeted tests and confirm failures (RED)**
- Run: `npm run test:frontend -- swipe-close-gesture`
- Run: `npm run test:e2e -- --project=phone-chromium --grep "density|landscape|touch targets|swipe"`

### Task 2: Implement swipe-close robustness fix

**Files:**
- Modify: `frontend/src/utils/swipeCloseGesture.ts`

**Step 1: Implement document-level pointer completion handling**
- Track active pointer start state.
- Attach/remove document listeners for `pointerup` and `pointercancel` after `pointerdown`.
- Ignore unrelated pointer IDs when available.

**Step 2: Keep compatibility with current component listeners**
- Preserve `onPointerDown/onPointerUp/onPointerCancel` API used by sheet components.
- Ensure no duplicate close invocation and proper state cleanup.

**Step 3: Run targeted gesture tests and confirm pass (GREEN)**
- Run: `npm run test:frontend -- swipe-close-gesture phone-scene-sheet phone-more-sheet phone-selected-sheet`

### Task 3: Implement touch target sizing fixes

**Files:**
- Modify: `styles/main.css`

**Step 1: Raise phone compact/comfortable token minimums for panel controls**
- Increase phone property panel toggle/input/action token heights to meet touch target minimum.

**Step 2: Raise phone landscape token minimums for nav/sheet controls**
- Ensure landscape `phone-nav-btn` and core sheet action controls remain at least 44px.

**Step 3: Validate with E2E checks**
- Run: `npm run test:e2e -- --project=phone-chromium --grep "touch targets|density|landscape"`

### Task 4: Update project documentation system

**Files:**
- Create: `docs/README.md`
- Create: `docs/documentation-system.md`
- Modify: `README.md`
- Modify: `TESTING-GUIDE.md`
- Modify: `CHANGELOG.md`

**Step 1: Create docs index (`docs/README.md`)**
- Build a single navigation page by domain (getting started, testing, architecture, release, plans, history).

**Step 2: Create documentation governance (`docs/documentation-system.md`)**
- Define doc taxonomy, ownership/update rules, naming conventions, archival policy, and “when code changes require doc updates”.

**Step 3: Wire project entry docs to docs system**
- Update root README with docs system entrypoint.
- Update testing guide with explicit mobile interaction verification checklist and thresholds.

**Step 4: Record release note**
- Add changelog entries for swipe-close robustness and touch target accessibility updates, plus docs system introduction.

### Task 5: Full verification and delivery

**Files:**
- Modify if needed after verification: same files as above

**Step 1: Run verification suite**
- Run: `npm run test:frontend`
- Run: `npm run test:e2e -- --project=phone-chromium`

**Step 2: Sanity check docs links and structure**
- Run: `rg -n "docs/README.md|documentation-system|mobile" README.md TESTING-GUIDE.md docs/README.md docs/documentation-system.md`

**Step 3: Prepare summary with evidence**
- Report changed files, bug fixes, and exact verification outputs.
