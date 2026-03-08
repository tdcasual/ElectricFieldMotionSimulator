# Property Drawer Restore Chain Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复属性抽屉在覆盖其他 authoring 抽屉后关闭时不会恢复上一层上下文的问题，避免 markdown / variables 面板被静默丢失。

**Architecture:** 复用现有 `drawerHistory` 机制，不再把 `property` 当成“永不恢复上一层”的特例。只在 `property` 真的是覆盖态时恢复历史；如果没有历史则保持当前“关闭后为空”的行为。用 store 回归测试锁定手动关闭与删除选中对象触发关闭两条路径。

**Tech Stack:** TypeScript, Pinia, Vitest.

---

### Task 1: 锁定属性抽屉关闭后丢失上层抽屉的问题

**Files:**
- Modify: `frontend/test/simulator-store.test.ts`

**Step 1: Write the failing test**
- 新增测试：先打开 `markdown`，再打开 `property`，关闭属性抽屉后应恢复到 `markdown`。
- 新增测试：同样链路下删除当前对象触发属性抽屉关闭后，也应恢复到 `markdown`。

**Step 2: Run test to verify it fails**
Run: `npm run test:frontend -- simulator-store`
Expected: FAIL，当前实现会把 `activeDrawer` 置空而不是恢复上层抽屉。

**Step 3: Write minimal implementation**
- 调整 `frontend/src/stores/simulatorStore.ts` 中 `closeDrawer()` 对 `property` 的特殊分支。
- 让 `property` 关闭时也走 `restorePreviousDrawer()`，但保留无历史时直接关闭的行为。

**Step 4: Run test to verify it passes**
Run: `npm run test:frontend -- simulator-store`
Expected: PASS

### Task 2: 回归验证与审计文档回填

**Files:**
- Modify: `docs/plans/2026-03-07-project-audit-round2-findings.md`
- Modify: `CHANGELOG.md`

**Step 1: Run verification**
- Run: `npm run test:frontend`
- Run: `npm run typecheck:frontend`
- Run: `npm run lint:frontend`
- Run: `git diff --check`

**Step 2: Record findings**
- 在 findings / changelog 中补充该 authoring 抽屉状态恢复问题与修复说明。
