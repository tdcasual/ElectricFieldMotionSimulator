# D-01 Node Compatibility Gate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate Node-version-driven false failures (especially Node 25 localStorage mismatch) and make frontend quality gates deterministic across local and CI environments.

**Architecture:** Add a frontend-test environment guard (storage shim) at Vitest setup layer, then codify Node version policy in repo metadata/docs, and finally enforce compatibility with CI matrix gates. Keep runtime behavior unchanged; this is strictly test/devops stability debt paydown.

**Tech Stack:** Node.js, Vitest (jsdom), GitHub Actions, npm, Vite.

---

### Task 1: Reproduce and lock the failing contract (RED)

**Files:**
- Create: `frontend/test/node-compatibility.test.ts`
- Modify: `frontend/test/simulator-store.test.ts`

**Step 1: Write failing tests for storage API contract**

Add `frontend/test/node-compatibility.test.ts` asserting:
- `window.localStorage` exists in frontend tests.
- `getItem/setItem/removeItem/clear/key` are callable functions.

In `frontend/test/simulator-store.test.ts`, add an explicit precondition assertion at top-level test setup:
- `expect(typeof window.localStorage.removeItem).toBe('function')`.

**Step 2: Run targeted tests to confirm RED**

Run:
```bash
npm run test:frontend -- frontend/test/node-compatibility.test.ts frontend/test/simulator-store.test.ts
```

Expected:
- FAIL in current Node 25 environment with `removeItem is not a function`-class error.

**Step 3: Commit failing test baseline (optional if your workflow allows red commits)**

```bash
git add frontend/test/node-compatibility.test.ts frontend/test/simulator-store.test.ts
git commit -m "test(frontend): capture node localStorage compatibility contract"
```

---

### Task 2: Add frontend test storage shim and wire setup (GREEN)

**Files:**
- Create: `frontend/test/setup/storage-shim.ts`
- Modify: `frontend/vite.config.ts`

**Step 1: Implement minimal setup shim**

In `frontend/test/setup/storage-shim.ts`:
- Detect missing/incomplete `window.localStorage` API (`getItem/setItem/removeItem/clear/key`).
- Provide an in-memory Storage-compatible fallback implementation.
- Attach to both `window.localStorage` and `globalThis.localStorage` for test consistency.

Keep it minimal:
- No persistence to disk.
- Deterministic reset behavior via `clear()`.

**Step 2: Wire setup in Vitest config**

Update `frontend/vite.config.ts`:
- add `test.setupFiles` with `['./test/setup/storage-shim.ts']`.

**Step 3: Run targeted tests to confirm GREEN**

Run:
```bash
npm run test:frontend -- frontend/test/node-compatibility.test.ts frontend/test/simulator-store.test.ts
```

Expected:
- PASS.

**Step 4: Run full frontend tests**

Run:
```bash
npm run test:frontend
```

Expected:
- PASS without localStorage method errors.

**Step 5: Commit**

```bash
git add frontend/test/setup/storage-shim.ts frontend/vite.config.ts frontend/test/node-compatibility.test.ts frontend/test/simulator-store.test.ts
git commit -m "fix(test): normalize localStorage contract across node runtimes"
```

---

### Task 3: Codify Node version policy in repo metadata and docs

**Files:**
- Create: `.nvmrc`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `TESTING-GUIDE.md`
- Create: `test/node_policy.test.js`

**Step 1: Define project Node baseline**

Create `.nvmrc` with:
- `24`

Update `package.json` with:
- `"engines": { "node": ">=24 <26", "npm": ">=10" }`

**Step 2: Document policy**

Update `README.md` and `TESTING-GUIDE.md`:
- Explicitly state verified Node range (`24.x` and `25.x`).
- Mention preferred local baseline (`24.x`) and CI matrix validation.

**Step 3: Add drift guard test**

Create `test/node_policy.test.js` that asserts:
- `.nvmrc` exists and is non-empty.
- `package.json.engines.node` exists.
- `README.md`/`TESTING-GUIDE.md` contain Node policy wording.

**Step 4: Verify**

Run:
```bash
npm test -- test/node_policy.test.js
```

Expected:
- PASS.

**Step 5: Commit**

```bash
git add .nvmrc package.json README.md TESTING-GUIDE.md test/node_policy.test.js
git commit -m "chore(env): codify node runtime policy and docs"
```

---

### Task 4: Enforce Node compatibility in CI

**Files:**
- Modify: `.github/workflows/frontend-rewrite-gates.yml`

**Step 1: Split quality gate coverage**

Refactor workflow into:
- `quality-gates` matrix job over Node `24` and `25` for:
  - `npm run lint:frontend`
  - `npm run typecheck:frontend`
  - `npm test`
  - `npm run test:frontend`
- `e2e-gates` single Node `24` job for:
  - Playwright install + `npm run test:e2e`

Reason:
- Keep Node-compat checks broad.
- Keep E2E runtime cost controlled.

**Step 2: Verify workflow syntax locally (basic)**

Run:
```bash
rg -n "matrix|node-version|quality-gates|e2e-gates" .github/workflows/frontend-rewrite-gates.yml
```

Expected:
- Matrix + split jobs are visible and correctly referenced.

**Step 3: Local gate smoke**

Run:
```bash
npm run lint:frontend
npm run typecheck:frontend
npm test
npm run test:frontend
```

Expected:
- PASS.

**Step 4: Commit**

```bash
git add .github/workflows/frontend-rewrite-gates.yml
git commit -m "ci: add node 24/25 quality matrix and isolate e2e gate"
```

---

### Task 5: Final verification and closure update

**Files:**
- Modify: `docs/plans/2026-03-03-tech-debt-ledger.md`
- Modify: `CHANGELOG.md`

**Step 1: Run full local quality chain**

Run:
```bash
npm run quality:all
```

Expected:
- PASS in the active local Node environment.

If Node switching is available, also run:
```bash
nvm use 24 && npm run test:frontend
nvm use 25 && npm run test:frontend
```

Expected:
- both PASS.

**Step 2: Mark D-01 status**

Update `docs/plans/2026-03-03-tech-debt-ledger.md` entry `D-01`:
- `open -> mitigated` with date and verification evidence.

Update `CHANGELOG.md` with:
- test environment compatibility hardening note.
- Node policy + CI matrix note.

**Step 3: Commit**

```bash
git add docs/plans/2026-03-03-tech-debt-ledger.md CHANGELOG.md
git commit -m "docs: record d-01 mitigation evidence and release note"
```

---

## Daily Execution Checklist (for this plan)

- Start each session with:
  - `npm test -- test/node_policy.test.js`
  - `npm run test:frontend -- frontend/test/node-compatibility.test.ts`
- Keep each task in one PR (or one commit if single-branch flow).
- Do not bundle D-02/D-03 refactors into this plan.

## Success Criteria

- Frontend tests no longer fail due to missing `localStorage` methods under Node 25.
- Node version policy is explicit and discoverable in code + docs.
- CI validates quality gates on Node 24 and 25.
- D-01 is downgraded from `open` to `mitigated` with reproducible evidence.
