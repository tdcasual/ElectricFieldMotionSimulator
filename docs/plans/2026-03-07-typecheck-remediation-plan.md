# Frontend Typecheck Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复当前前端 `tsc --noEmit` 暴露的既有类型错误，恢复 `npm run typecheck:frontend` 到可用状态。

**Architecture:** 以最小改动为原则，优先修复已定位的三类问题：runtime 空值缩窄、Vue test wrapper API 类型误用、旧测试中对 `registry` / `schema` / `particle.velocity` 的过宽 `unknown` 推断。尽量只补显式类型、局部辅助类型和更精确的断言，不改变运行时行为。

**Tech Stack:** TypeScript, Vue 3, Vitest, Node test runner.

---

### Task 1: 修复 runtime 空值缩窄错误

**Files:**
- Modify: `frontend/src/runtime/simulatorRuntime.ts`

**Step 1: 用 typecheck 复现 RED**
- Run: `npm run typecheck:frontend`
- Expected: `realValue is possibly null`

**Step 2: 写最小实现**
- 在显示几何分支中显式处理 `realValue == null`，让后续缩放计算使用已缩窄后的 number。

**Step 3: 运行 typecheck 确认局部 GREEN**
- Run: `npm run typecheck:frontend`
- Expected: 该报错消失。

### Task 2: 修复 `phone-more-sheet` 测试 wrapper 类型误用

**Files:**
- Modify: `frontend/test/phone-more-sheet.test.ts`

**Step 1: 用 typecheck 复现 RED**
- Run: `npm run typecheck:frontend`
- Expected: `Property 'exists' does not exist on type 'Omit<DOMWrapper<Element>, "exists">'`

**Step 2: 写最小实现**
- 将 `get(...).exists()` 改为 `find(...).exists()`，保持断言语义不变。

**Step 3: 运行 typecheck 确认局部 GREEN**
- Run: `npm run typecheck:frontend`
- Expected: 该报错消失。

### Task 3: 修复 `simulator-runtime` 测试中的 `unknown` 推断

**Files:**
- Modify: `frontend/test/simulator-runtime.test.ts`

**Step 1: 用 typecheck 复现 RED**
- Run: `npm run typecheck:frontend`
- Expected: `schema` spy / `entry.schema` / `particle.velocity` 相关类型错误。

**Step 2: 写最小实现**
- 为测试引入局部辅助类型，显式约束 `registry.get(...).schema` 为函数。
- 对 `schema` 返回值、`field.bind.set` 和 `particle.velocity` 使用最小必要断言，避免 `unknown` 漫延。

**Step 3: 运行 typecheck 确认 GREEN**
- Run: `npm run typecheck:frontend`
- Expected: 前端 typecheck 通过。

### Task 4: 回归验证与收尾

**Files:**
- Modify if needed: 上述文件

**Step 1: 运行验证**
- Run: `npm run typecheck:frontend`
- Run: `npm run test:frontend -- simulator-runtime phone-more-sheet`
- Run: `npm run lint:frontend`
- Run: `npm run test:frontend`

**Step 2: 记录结果**
- 如通过，将修复结果补充到 `CHANGELOG.md` 和审计文档中（若有必要）。
