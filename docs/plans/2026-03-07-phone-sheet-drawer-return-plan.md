# Phone Sheet Drawer Return Chain Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复手机端从 `selected / more` Sheet 打开属性抽屉、变量表或题板后，关闭抽屉不会回到来源 Sheet 的问题。

**Architecture:** 保留 `phoneActiveSheet` 作为“来源 Sheet”状态，不再在打开抽屉时强制清空；同时在 `activeDrawer !== null` 时临时挂起 Sheet 渲染，使抽屉成为真正的上层覆盖。这样关闭抽屉后可以自然恢复来源 Sheet，而不是把用户打回空状态。

**Tech Stack:** TypeScript, Vue 3, Pinia, Vitest.

---

### Task 1: 锁定手机 Sheet → Drawer → 返回链断开问题

**Files:**
- Modify: `frontend/test/app-shell.test.ts`

**Step 1: Write the failing test**
- 新增测试：手机端打开 `selected` Sheet，点击“属性”进入属性抽屉，关闭抽屉后应回到 `selected` Sheet。
- 新增测试：手机端打开 `more` Sheet，进入变量表，关闭变量表后应回到 `more` Sheet。

**Step 2: Run test to verify it fails**
Run: `npm run test:frontend -- app-shell`
Expected: FAIL，当前实现会把来源 Sheet 状态清空，关闭抽屉后不会恢复。

**Step 3: Write minimal implementation**
- 在 `frontend/src/modes/usePhoneSheets.ts` 中引入“抽屉打开时挂起 Sheet 渲染”的计算逻辑。
- 调整 `frontend/src/modes/useAppActions.ts` 中从手机 Sheet 打开抽屉的动作，不再直接 `closePhoneSheets()`。

**Step 4: Run test to verify it passes**
Run: `npm run test:frontend -- app-shell`
Expected: PASS

### Task 2: 回归验证与文档回填

**Files:**
- Modify: `docs/plans/2026-03-07-project-audit-round2-findings.md`
- Modify: `CHANGELOG.md`

**Step 1: Run verification**
- Run: `npm run test:frontend`
- Run: `npm run typecheck:frontend`
- Run: `npm run lint:frontend`
- Run: `git diff --check`

**Step 2: Record findings**
- 在 findings / changelog 中补充手机 Sheet 返回链修复说明。
