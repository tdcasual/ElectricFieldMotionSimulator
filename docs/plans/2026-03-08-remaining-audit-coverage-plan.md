# Remaining Audit Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 清零 A-H 分区域审计中的剩余空白，补审 C / E / H 薄弱区域，修复新增明确问题，并形成“无未审计区域”的结论。

**Architecture:** 先以既有审计方案和 Round 1 / Round 2 结果建立区域覆盖矩阵，明确每个区域的证据、已关闭问题和剩余验证缺口；再针对 C / E / H 做静态代码审计、定向测试与真实浏览器流审计；若发现明确缺陷，先写失败用例再做最小修复，最后统一回填审计文档与验证证据。

**Tech Stack:** Vue 3、TypeScript、Vitest、Node.js test runner、Playwright、Vite。

---

### Task 1: 建立 A-H 覆盖矩阵

**Files:**
- Modify: `docs/plans/2026-03-07-project-audit-round2-findings.md`
- Reference: `docs/plans/2026-03-06-project-audit-plan.md`
- Reference: `docs/plans/2026-03-06-project-audit-round1-findings.md`

**Step 1: 汇总区域定义与已有 findings**

- 从审计方案中提取 A-H 区域职责与建议检查项。
- 从 Round 1 / Round 2 提取每个区域已覆盖的问题与验证证据。

**Step 2: 标出剩余缺口**

- 明确 C / E / H 当前缺少的代码审计点、自动化证据或浏览器流证据。
- 在 Round 2 文档中加入“覆盖矩阵 / 待补审项”草稿段落。

**Step 3: 自检矩阵完整性**

Run: `rg -n "A\.|B\.|C\.|D\.|E\.|F\.|G\.|H\." docs/plans/2026-03-06-project-audit-*.md docs/plans/2026-03-07-project-audit-round2-findings.md`

### Task 2: 补审 C 区对象创建、工具栏与预设链路

**Files:**
- Inspect: `frontend/src/components/DesktopToolbarSidebar.vue`
- Inspect: `frontend/src/components/ToolbarPanel.vue`
- Inspect: `frontend/src/components/PhoneAddSheet.vue`
- Inspect: `frontend/src/stores/simulatorStore.ts`
- Inspect/Test: `frontend/test/desktop-toolbar-sidebar.test.ts`
- Inspect/Test: `frontend/test/toolbar-panel.test.ts`
- Inspect/Test: `frontend/test/phone-authoring-sheets.test.ts`
- Inspect/Test: `frontend/e2e/core-path.spec.ts`

**Step 1: 审核创建语义与反馈一致性**

- 检查桌面 / 手机 / 预设三条入口在创建位置、选中态、后续编辑入口、状态提示上是否一致。
- 特别关注重复点击、双击创建、加载预设后的选中态 / 视口 / 状态栏同步。

**Step 2: 记录新增缺陷或确认无新增**

- 若发现明确 bug，先补最小失败测试。
- 若未发现新增问题，在 Round 2 文档补“已补审，无新增明确问题”的覆盖记录。

**Step 3: 运行定向验证**

Run: `npm run test:frontend -- desktop-toolbar-sidebar toolbar-panel phone-authoring-sheets simulator-store`

### Task 3: 补审 E 区运行控制与模式切换链路

**Files:**
- Inspect: `frontend/src/components/HeaderActionButtons.vue`
- Inspect: `frontend/src/modes/useAppActions.ts`
- Inspect: `frontend/src/runtime/simulatorRuntime.ts`
- Inspect: `js/modes/DemoMode.js`
- Inspect/Test: `frontend/test/header-action-buttons.test.ts`
- Inspect/Test: `frontend/test/use-app-actions.test.ts`
- Inspect/Test: `frontend/test/scene-settings-controls.test.ts`
- Inspect/Test: `test/demo_mode.test.js`

**Step 1: 审核运行态与 demo mode 边界**

- 检查播放 / 暂停 / 重置 / 清空 / demo mode 切换是否在桌面、手机、嵌入态上语义一致。
- 特别关注 demo mode 退出后的视口、选中态、控制区状态是否恢复一致。

**Step 2: 发现问题先红测**

- 对明确复现的问题先写 Vitest 或 Node 回归用例。
- 再做最小实现修复，避免扩大行为面。

**Step 3: 运行定向验证**

Run: `npm run test:frontend -- header-action-buttons use-app-actions scene-settings-controls simulator-runtime`
Run: `npm test -- demo_mode.test.js`

### Task 4: 补审 H 区视觉层级与可访问性

**Files:**
- Inspect: `styles/main.css`
- Inspect: `frontend/src/components/HeaderStatusAndSettings.vue`
- Inspect: `frontend/src/components/PhoneMoreSheet.vue`
- Inspect/Test: `frontend/test/tokens.test.ts`
- Inspect/Test: `frontend/test/app-status-footer.test.ts`
- Inspect/Test: `frontend/e2e/responsive-visual.spec.ts`
- Inspect/Test: `frontend/e2e/touch-core-path.spec.ts`

**Step 1: 审核可发现性、触达尺寸与危险动作层级**

- 检查 icon-only 按钮标签、focus/pressed 反馈、危险动作视觉层级、手机触控尺寸与底部安全区。
- 结合已有快照与 DOM 断言确认关键交互反馈未回退。

**Step 2: 必要时补测试并修复**

- 对明确违反触达尺寸、语义标签或层级反馈的问题补失败用例。
- 做最小样式或模板修复，并避免影响现有布局。

**Step 3: 运行定向验证**

Run: `npm run test:frontend -- tokens app-status-footer header-status-and-settings phone-more-sheet`
Run: `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- --grep "touch|responsive|demo|toolbar"`

### Task 5: 真实浏览器流复核与文档收口

**Files:**
- Modify: `docs/plans/2026-03-07-project-audit-round2-findings.md`
- Modify: `CHANGELOG.md`
- Optional Modify: `TESTING-GUIDE.md`

**Step 1: 跑真实浏览器关键流**

- 用 Playwright 或现有 E2E 覆盖创建、预设、播放、demo、手机切换、危险操作、视觉快照。
- 记录新增发现或确认关键流正常。

**Step 2: 更新审计结论**

- 在 Round 2 文档补齐 A-H 覆盖矩阵、C / E / H 补审结果、关闭项与“无未审计区域”结论。
- 如有代码修复，同步简要回填 `CHANGELOG.md`。

**Step 3: 完整验证**

Run: `npm test`
Run: `npm run test:frontend`
Run: `npm run typecheck:frontend`
Run: `npm run lint:frontend`
Run: `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e`
Run: `git diff --check`
