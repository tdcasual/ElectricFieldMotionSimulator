# P1-P2 审计问题修复 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复首轮审计中确认的全部 P1/P2 问题，使 E2E 验收链路可信、手机主链路恢复顺畅，并降低已确认的手机/桌面交互理解与误触风险。

**Architecture:** 先修“验证基础设施”再修“真实产品行为”，避免被失真的 E2E 结果误导。行为修复尽量落在现有边界上：Playwright 配置统一走 `baseURL`；对象创建统一设置选中态；手机 sheet 切换由 `usePhoneSheets` 负责编排；P2 优先通过低风险的局部文案、分组和确认增强来解决，不大改交互框架。

**Tech Stack:** Playwright, Vitest, Node test runner, Vue 3, TypeScript, legacy JS runtime/interaction layer, CSS.

---

### Task 1: 修复 E2E 验收链路硬编码

**Files:**
- Modify: `frontend/playwright.config.ts`
- Modify: `frontend/e2e/core-path.spec.ts`
- Modify: `frontend/e2e/touch-core-path.spec.ts`
- Modify: `frontend/e2e/responsive-visual.spec.ts`
- Modify: `frontend/e2e/embed-protocol.spec.ts`
- Create: `test/e2e_url_consistency.test.js`

**Step 1: 写失败测试**
- 新增 Node 测试，扫描 `frontend/e2e/*.spec.ts`，若出现硬编码 `localhost:5173` / `127.0.0.1:5173` 则失败。
- 同时断言 `frontend/playwright.config.ts` 不再启用会误复用外部服务的配置组合。

**Step 2: 运行失败测试确认 RED**
- Run: `node --test test/e2e_url_consistency.test.js`
- Expected: FAIL，指出当前 e2e spec 和/或 config 中存在硬编码 URL。

**Step 3: 实现最小修复**
- Playwright 配置改为：统一 `baseURL`，固定项目自用端口并启用 `strictPort`，关闭不安全的 `reuseExistingServer`。
- 所有 e2e spec 改为 `page.goto('/')` 或相对路径（如 `/embed-host-test.html`）。

**Step 4: 运行目标验证确认 GREEN**
- Run: `node --test test/e2e_url_consistency.test.js`
- Expected: PASS

### Task 2: 修复手机“添加 -> 选中 -> 编辑”主链路

**Files:**
- Modify: `frontend/src/runtime/simulatorRuntime.ts`
- Modify: `js/interactions/DragDropManager.js`
- Modify: `frontend/src/modes/usePhoneSheets.ts`
- Modify: `frontend/src/modes/useAppActions.ts`
- Modify: `frontend/test/simulator-runtime.test.ts`
- Modify: `frontend/test/use-phone-sheets.test.ts`

**Step 1: 写失败测试**
- 给 `simulatorRuntime` 增加测试：创建对象后应成为当前选中对象。
- 给 `usePhoneSheets` 增加测试：手机处于 `add` sheet 时，创建导致选中对象出现后，应自动切换到 `selected` sheet。

**Step 2: 运行目标测试确认 RED**
- Run: `npm run test:frontend -- simulator-runtime use-phone-sheets`
- Expected: FAIL，证明当前创建后未选中、未切换到 selected sheet。

**Step 3: 实现最小修复**
- runtime/dragdrop 创建对象后统一设置 `scene.selectedObject`。
- 手机端创建后不再直接粗暴关闭全部 sheet，而是让 `usePhoneSheets` 在选中对象出现时从 `add` 过渡到 `selected`。

**Step 4: 运行目标测试确认 GREEN**
- Run: `npm run test:frontend -- simulator-runtime use-phone-sheets`
- Expected: PASS

### Task 3: 修复 P2 模式说明与本地解释缺失

**Files:**
- Modify: `frontend/src/components/HeaderStatusAndSettings.vue`
- Modify: `frontend/src/components/SceneSettingsControls.vue`
- Modify: `frontend/test/header-status-and-settings.test.ts`

**Step 1: 写失败测试**
- 增加测试：手机状态条在 demo mode 下显示更短、更明确的模式说明。
- 增加测试：场景参数面板在 demo mode 下显示局部说明，而不是只留下 disabled 控件。

**Step 2: 运行目标测试确认 RED**
- Run: `npm run test:frontend -- header-status-and-settings`
- Expected: FAIL，说明当前文案/说明缺失。

**Step 3: 实现最小修复**
- 在手机状态条中显示简化后的模式说明。
- 在 `SceneSettingsControls` 中为 demo mode 添加本地提示文案，说明比例尺/重力为何锁定。

**Step 4: 运行目标测试确认 GREEN**
- Run: `npm run test:frontend -- header-status-and-settings`
- Expected: PASS

### Task 4: 修复 P2 危险操作与桌面可发现性问题

**Files:**
- Modify: `frontend/src/modes/useAppActions.ts`
- Modify: `frontend/src/components/PhoneMoreSheet.vue`
- Modify: `frontend/src/components/DesktopToolbarSidebar.vue`
- Modify: `frontend/test/use-app-actions.test.ts`
- Modify: `frontend/test/desktop-toolbar-sidebar.test.ts`

**Step 1: 写失败测试**
- 增加测试：手机端 `resetScene` 需先确认，再执行。
- 增加测试：桌面侧边栏展示明确的创建说明（单击放置、双击居中创建）。

**Step 2: 运行目标测试确认 RED**
- Run: `npm run test:frontend -- use-app-actions desktop-toolbar-sidebar`
- Expected: FAIL

**Step 3: 实现最小修复**
- 手机端为 `resetScene` 增加确认，降低误触成本。
- `PhoneMoreSheet` 将 `清空场景` 提升为单独危险动作分区。
- 桌面侧边栏新增简明创建提示，降低“单击为何不创建”的理解成本。

**Step 4: 运行目标测试确认 GREEN**
- Run: `npm run test:frontend -- use-app-actions desktop-toolbar-sidebar`
- Expected: PASS

### Task 5: 端到端与全量验证

**Files:**
- Modify if needed after verification: same files as above

**Step 1: 运行分层验证**
- Run: `node --test test/e2e_url_consistency.test.js`
- Run: `npm run test:frontend -- simulator-runtime use-phone-sheets header-status-and-settings use-app-actions desktop-toolbar-sidebar`
- Run: `npm test`
- Run: `npm run test:frontend`

**Step 2: 运行关键 E2E 回归**
- Run: `npm run test:e2e`
- Expected: 至少不再因错误复用外部服务而整批失真；若仍失败，失败应指向真实产品问题。

**Step 3: 更新审计结论**
- 修改 `docs/plans/2026-03-06-project-audit-round1-findings.md`
- 将已修复项标注为 fixed / mitigated，并补充验证命令与结果。
