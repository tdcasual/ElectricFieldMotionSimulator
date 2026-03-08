# Browser Expression UI Profile Baseline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 expression 绑定与属性抽屉 / 变量表联动场景补上真实浏览器主线程 `FPS / frame time / long-task` 基线。

**Architecture:** 继续沿用“开发态最小 profile harness + 真实浏览器 DOM 交互”的策略：harness 只补充稳定的选中与开抽屉入口，真正的表达式输入、变量应用、抽屉恢复仍通过页面 DOM 完成；页面内采样统一使用 `requestAnimationFrame`、`PerformanceObserver(longtask)`、运行态快照和 expression hint 文本样本，输出结构化报表。

**Tech Stack:** Vue 3, Pinia, TypeScript, Playwright, Node test runner, Vite.

---

### Task 1: 补充 expression UI profiling 所需的最小 harness 入口

**Files:**
- Modify: `frontend/src/embed/profileHarness.ts`
- Modify: `frontend/src/main.ts`
- Modify: `frontend/src/runtime/simulatorRuntime.ts`
- Modify: `frontend/src/stores/simulatorStore.ts`
- Test: `frontend/test/profile-harness.test.ts`

**Step 1: 写失败测试**
- 扩展 `profile-harness.test.ts`，断言句柄新增 `selectObjectByIndex()`、`openPropertyPanel()`、`openVariablesPanel()`。
- 断言这些方法透传 store 返回值，不引入额外副作用。

**Step 2: 运行目标测试确认 RED**
- Run: `npm run test:frontend -- profile-harness`
- Expected: FAIL，提示句柄缺少上述方法或 store 类型不匹配。

**Step 3: 写最小实现**
- runtime 提供按索引选中对象的最小 public API。
- store 暴露轻量包装方法。
- profile harness 在开发态挂出这几个方法，供浏览器 profile 脚本稳定驱动 UI。

**Step 4: 运行目标测试确认 GREEN**
- Run: `npm run test:frontend -- profile-harness`
- Expected: PASS

### Task 2: 提炼 expression UI 浏览器 profile 的场景与汇总逻辑

**Files:**
- Create: `scripts/lib/browserExpressionUiProfile.mjs`
- Create: `test/browser_expression_ui_profile.test.js`

**Step 1: 写失败测试**
- 新增 Node 测试，断言 helper 提供 variable/time 两个浏览器场景。
- 断言汇总结果包含 `avgFps`、`p95FrameMs`、`longTaskCount`、`hintChangeCount`、`finalHintText`、`successfulIterations`。

**Step 2: 运行目标测试确认 RED**
- Run: `node --test test/browser_expression_ui_profile.test.js`
- Expected: FAIL，提示 helper 或字段缺失。

**Step 3: 写最小实现**
- 生成大量 expression 粒子的场景数据。
- 复用通用 render summary，并叠加 hint 文本变化与交互轮次统计。

**Step 4: 运行目标测试确认 GREEN**
- Run: `node --test test/browser_expression_ui_profile.test.js`
- Expected: PASS

### Task 3: 新增真实浏览器 expression UI profile 命令

**Files:**
- Create: `scripts/profile-browser-expressions.mjs`
- Modify: `package.json`
- Modify: `TESTING-GUIDE.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/plans/2026-03-07-project-audit-round2-findings.md`

**Step 1: 实现最小脚本**
- 启动独立 Vite dev server。
- 在 Chromium 中：加载 stress 场景、选中对象、打开属性抽屉。
- variable 场景通过真实变量表 DOM 应用多轮变量更新，并验证属性抽屉恢复后的 expression hint。
- time 场景在属性抽屉打开时运行模拟，采集 hint 文本随 `t` 变化的样本。
- 输出 JSON 明细与摘要表。

**Step 2: 运行目标命令验证**
- Run: `npm run profile:browser-expressions`
- Expected: 输出至少两组 expression UI 浏览器基线结果。

**Step 3: 更新文档**
- 记录命令、环境变量和 findings 闭环结果。

### Task 4: 分层验证与收尾

**Files:**
- Modify if needed: 上述文件

**Step 1: 运行定向验证**
- Run: `npm run test:frontend -- profile-harness`
- Run: `node --test test/browser_expression_ui_profile.test.js`
- Run: `npm run profile:browser-expressions`

**Step 2: 运行回归验证**
- Run: `npm test`
- Run: `npm run test:frontend`
- Run: `npm run lint:frontend`

**Step 3: 记录验证结果**
- 将基线结果补充到文档与 findings，便于后续继续扩审。
