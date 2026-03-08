# Scene Switch Variable Draft Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复场景切换后 `variableDraft` 仍停留在旧场景内容的问题，保证变量表与当前场景变量一致。

**Architecture:** 在 store 层集中补一个“从 runtime 当前 scene 同步变量 draft”的共享 helper，只在成功的场景替换操作后调用：`loadSceneData`、`loadScene`、`importScene`、`loadPreset`。这样既避免变量表在普通 render/snapshot 中不断覆盖用户草稿，也能在真正切换场景后及时刷新变量上下文。

**Tech Stack:** TypeScript, Pinia, Vitest.

---

### Task 1: 锁定场景切换后的旧变量 draft 问题

**Files:**
- Modify: `frontend/test/simulator-store.test.ts`

**Step 1: 写失败测试**
- 新增测试：变量表打开后执行 `loadSceneData()`，若新场景带 `variables`，`variableDraft` 应同步为新值。
- 新增测试：`loadPreset()` 后，`variableDraft` 也应同步为预设场景变量。

**Step 2: 运行目标测试确认 RED**
- Run: `npm run test:frontend -- simulator-store`
- Expected: FAIL，说明当前 draft 仍停留在旧变量。

**Step 3: 写最小实现**
- store 中新增共享 helper，从 `getRuntime().scene.variables` 归一化刷新 `variableDraft`。
- 在成功的场景替换路径后调用该 helper。

**Step 4: 运行目标测试确认 GREEN**
- Run: `npm run test:frontend -- simulator-store`
- Expected: PASS

### Task 2: 回归验证

**Files:**
- Modify if needed: 上述文件

**Step 1: 运行验证**
- Run: `npm run test:frontend -- simulator-store`
- Run: `npm run test:frontend`
- Run: `npm run typecheck:frontend`

**Step 2: 记录结果**
- 如行为已确认，可在 findings / changelog 中补充说明。
