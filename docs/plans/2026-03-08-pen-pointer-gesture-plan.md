# Pen Pointer Gesture Classification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复 `pointerType === "pen"` 被当成 touch 处理，导致手写笔误触发长按/双击开属性等触控手势的问题。

**Architecture:** 在 `DragDropManager` 中把 touch-only 手势判定统一收敛为“仅 `pointerType === 'touch'`”。同时把拖拽阈值与 tap-chain 逻辑从“非 mouse”改成“仅 touch”，让 pen 回到更接近 mouse 的精确指针语义，避免 stylus 用户被双击/长按手势误伤。

**Tech Stack:** JavaScript, Node test, JSDOM.

---

### Task 1: 锁定 pen 被误判为 touch 的问题

**Files:**
- Modify: `test/dragdrop_manager_dom.test.js`

**Step 1: Write the failing test**
- 新增测试：pen 双击不应触发 `show-properties`。
- 新增测试：pen 在对象上 pointerdown 时不应启动 touch long-press timer。

**Step 2: Run test to verify it fails**
Run: `node --test test/dragdrop_manager_dom.test.js`
Expected: FAIL，当前实现把 pen 当成 touch，会误触发长按/双击属性逻辑。

**Step 3: Write minimal implementation**
- 调整 `js/interactions/DragDropManager.js` 中 `isTouchPointerEvent()` 为只接受 `pointerType === 'touch'`。
- 将长按开启、tap-chain 处理与拖拽阈值切换到 touch-only 判定。

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
- 在 findings / changelog 中补充 pen / stylus 输入分类修复说明。
