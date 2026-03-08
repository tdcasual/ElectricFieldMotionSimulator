# Browser Render Profile Baseline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为高频发射场景补上真实浏览器渲染线程中的 FPS / long-task 观测基线，形成可重复执行的 profile 命令。

**Architecture:** 采用“最小 profile 调试句柄 + 浏览器内采样”方案：前端仅向 `window` 暴露受限的 profile API（加载场景、启停运行、读取快照），Node 侧脚本通过 Playwright 打开真实页面，在页面内用 `requestAnimationFrame` 和 `PerformanceObserver(longtask)` 采集指标。这样既避免脆弱 UI 自动化，也不把 profiling 需求混入正式 host 协议。

**Tech Stack:** Vue 3, Pinia, TypeScript, Vite, Playwright, Node test runner, Vitest.

---

### Task 1: 暴露最小 profile 调试句柄

**Files:**
- Create: `frontend/src/embed/profileHarness.ts`
- Modify: `frontend/src/main.ts`
- Test: `frontend/test/profile-harness.test.ts`

**Step 1: 写失败测试**
- 新增 `frontend/test/profile-harness.test.ts`，断言安装后 `window.__ELECTRIC_FIELD_PROFILE__` 存在。
- 断言句柄仅暴露 `loadSceneData()`、`startRunning()`、`stopRunning()`、`getSnapshot()`。
- 断言 `getSnapshot()` 返回 `fps`、`particleCount`、`objectCount`、`running`。
- 断言卸载后该句柄被移除。

**Step 2: 运行目标测试确认 RED**
- Run: `npm run test:frontend -- profile-harness`
- Expected: FAIL，提示 profile harness 模块或 API 尚不存在。

**Step 3: 写最小实现**
- 在 `frontend/src/embed/profileHarness.ts` 中封装安装逻辑，避免把句柄拼装散落在 `main.ts`。
- `main.ts` 在非 test 浏览器环境中安装该句柄，与现有 host bridge 并存。

**Step 4: 运行目标测试确认 GREEN**
- Run: `npm run test:frontend -- profile-harness`
- Expected: PASS

### Task 2: 提炼浏览器 render profile 结果汇总逻辑

**Files:**
- Create: `scripts/lib/browserRenderProfile.mjs`
- Test: `test/browser_render_profile.test.js`

**Step 1: 写失败测试**
- 新增 `test/browser_render_profile.test.js`，为汇总函数提供固定 `frameDeltas`、`longTaskDurations`、`snapshots` 输入。
- 断言输出包含 `avgFps`、`p95FrameMs`、`longTaskCount`、`peakParticles`、`finalSnapshot` 等字段。

**Step 2: 运行目标测试确认 RED**
- Run: `node --test test/browser_render_profile.test.js`
- Expected: FAIL，提示汇总模块或字段不存在。

**Step 3: 写最小实现**
- 在 `scripts/lib/browserRenderProfile.mjs` 中实现：场景构造、百分位计算、浏览器采样结果汇总、摘要表生成。
- 保持纯函数边界，避免把浏览器/进程控制逻辑混进测试。

**Step 4: 运行目标测试确认 GREEN**
- Run: `node --test test/browser_render_profile.test.js`
- Expected: PASS

### Task 3: 新增真实浏览器 profile 命令

**Files:**
- Modify: `package.json`
- Create: `scripts/profile-browser-render.mjs`
- Modify: `TESTING-GUIDE.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/plans/2026-03-07-project-audit-round2-findings.md`

**Step 1: 基于已通过的纯函数与前端句柄实现最小脚本**
- 启动独立 Vite dev server（固定本地端口，支持 env 覆盖）。
- 用 Playwright 打开页面，等待 `window.__ELECTRIC_FIELD_PROFILE__` 就绪。
- 加载高频发射场景，运行固定时长，采集 `rAF` 帧间隔、`longtask`、快照样本。
- 输出 JSON 明细和 `console.table()` 摘要。

**Step 2: 运行目标命令验证**
- Run: `npm run profile:browser-render`
- Expected: 输出 JSON 与 summary table，且包含至少一个 profile 结果。

**Step 3: 更新文档**
- `TESTING-GUIDE.md` 记录命令与可调环境变量。
- `CHANGELOG.md` 和 `docs/plans/2026-03-07-project-audit-round2-findings.md` 记录该基线已落地。

### Task 4: 分层验证与收尾

**Files:**
- Modify if needed: 上述文件

**Step 1: 运行定向验证**
- Run: `npm run test:frontend -- profile-harness`
- Run: `node --test test/browser_render_profile.test.js`
- Run: `npm run profile:browser-render`

**Step 2: 运行回归验证**
- Run: `npm test`
- Run: `npm run test:frontend`

**Step 3: 记录验证结果**
- 将命令结果补充到审计 findings 与文档中，确保后续继续扩审时可复用。
