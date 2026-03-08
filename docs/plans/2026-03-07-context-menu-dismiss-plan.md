# Context Menu Dismiss Chain Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复桌面画布右键菜单在空白右键或后续直接操作开始时不会及时收起的问题，避免旧菜单残留干扰拖拽与选择反馈。

**Architecture:** 在 `DragDropManager` 中抽出统一的 `hideContextMenu()` helper，负责隐藏 DOM 菜单并清理延迟关闭 handler/timer。将该 helper 接到两条根路径：`onContextMenu()` 遇到空白区域时立即收口，`onPointerDown()` 开始新的直接操作前先关闭旧菜单。这样能从根上收敛 stale menu，而不是在上层动作里零散补丁。

**Tech Stack:** JavaScript, Node test, JSDOM.

---

### Task 1: 锁定右键菜单残留问题

**Files:**
- Modify: `test/dragdrop_manager_dom.test.js`

**Step 1: Write the failing test**
- 新增测试：已有菜单打开时，在空白区域再次右键，菜单应立即隐藏。
- 新增测试：已有菜单打开时，新的 `pointerdown` 开始前应立即隐藏旧菜单，避免残留到拖拽流程。

**Step 2: Run test to verify it fails**
Run: `node --test test/dragdrop_manager_dom.test.js`
Expected: FAIL，当前实现没有统一收口 helper，菜单会残留。

**Step 3: Write minimal implementation**
- 在 `js/interactions/DragDropManager.js` 中新增 `hideContextMenu()` helper。
- 在 `onPointerDown()` 开头调用。
- 在 `onContextMenu()` 中先隐藏旧菜单；若命中空白区域则只关闭不再重开。

**Step 4: Run test to verify it passes**
Run: `node --test test/dragdrop_manager_dom.test.js`
Expected: PASS

### Task 2: 回归验证与文档回填

**Files:**
- Modify: `docs/plans/2026-03-07-project-audit-round2-findings.md`
- Modify: `CHANGELOG.md`

**Step 1: Run verification**
- Run: `node --test test/dragdrop_manager_dom.test.js`
- Run: `npm test`
- Run: `npm run test:frontend`
- Run: `npm run typecheck:frontend`
- Run: `npm run lint:frontend`
- Run: `git diff --check`

**Step 2: Record findings**
- 在 findings / changelog 中补充 B 区上下文菜单收口修复说明。
