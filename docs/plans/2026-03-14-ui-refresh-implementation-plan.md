# UI Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不改动模拟器核心物理行为的前提下，把当前 UI 从“功能齐全的工程工具”升级为“教学 / 演示友好、层级清晰、桌面与手机都更有完成度的产品界面”。

**Architecture:** 保持现有 `Vue shell -> Pinia store -> simulatorRuntime -> Canvas layers` 主架构不变，优先通过壳层重组、样式 token 收敛、空状态与引导补强、移动端 sheet 体验优化来升级 UI。除为 UI 展示增加极少量只读状态透传外，不触碰 engine 与 runtime 的核心物理逻辑。

**Tech Stack:** Vue 3、TypeScript、Pinia、Vite、Vitest、Playwright、CSS token（`styles/*.css`）、原生 Canvas。

---

## Context

当前界面已经具备明确的“工程面板 / 课堂演示”骨架：

- 桌面端是 `左工具栏 + 中央画布 + 顶部控制 + 底部状态栏`
- 手机端是 `顶部压缩状态 + 中央画布 + 底部导航 + 上拉 sheet`
- 核心功能链路和适配策略都已存在，问题主要集中在信息层级、视觉记忆点、首次使用引导、主题统一性和动效语言

本次改版不追求大重写，而是做一轮“壳层重构 + 设计语言升级”：

1. 让用户一眼看懂“现在是什么模式、下一步该做什么”。
2. 让桌面头部不再拥挤，操作分组更清楚。
3. 让空画布不再只是网格，而是能承担教学引导。
4. 让默认主题更有“实验台 / 场域观察”辨识度。
5. 让手机端保留当前交互优势，同时显得更稳、更像产品而不是压缩版桌面页。

## Approach Options

### Option A — 工程白板 Minimal

- 保留浅色主题为主，强化表格感、分区线和排版秩序。
- **优点：** 改动最稳，和当前 UI 连续性最好。
- **缺点：** 视觉记忆点有限，难以显著提升产品气质。

### Option B — 场域观测台 Instrument Panel（推荐）

- 以“实验观测台 / 仪器界面”为主方向，强化模式标签、状态条、网格舞台、分区节奏和深浅双主题的统一语言。
- **优点：** 最契合模拟器 + 教学演示场景，深色主题已有基础，能在不夸张的情况下显著提升质感。
- **缺点：** 需要同步整理桌面 / 手机 / token / 文案，工作量中等。

### Option C — 教学讲义 Hybrid

- 以“讲题板 + 演示器”方向重做，画布周边加入更强的课程引导和题面感。
- **优点：** 教学感最强。
- **缺点：** 容易压过编辑器属性，且和当前工程工具骨架偏离较大。

**Recommendation:** 采用 Option B，并吸收 Option C 的“首次使用引导”优点，但不把主界面做成讲义页。

## Success Metrics

- 桌面端 `1280px+` 宽度下，头部不再依赖横向滚动承载核心操作。
- 桌面端空场景时，画布内出现明确引导，不需要用户阅读左侧小字才能开始。
- 手机端核心链路保持不变：
  - 添加对象
  - 打开场景参数
  - 播放 / 暂停
  - 打开更多
- 深浅主题都保持同一设计语言，不再出现“深色专业、浅色普通”的断层。
- `responsive-visual.spec.ts` 快照稳定更新，视觉回归可被自动发现。
- 现有交互测试和主链路 e2e 不回归。

## Phase Timeline

- **Phase 0（0.5 天）**：冻结基线与视觉验收标准。
- **Phase 1（1 天）**：重做设计 token 与主题语言。
- **Phase 2（1-1.5 天）**：重构桌面头部与状态层级。
- **Phase 3（1 天）**：补齐画布空状态与教学引导。
- **Phase 4（1 天）**：升级左侧工具栏与预设区表现。
- **Phase 5（1-1.5 天）**：优化手机端层级、sheet 节奏与导航状态。
- **Phase 6（0.5-1 天）**：统一动效与无障碍细节。
- **Phase 7（0.5 天）**：更新测试、快照、文档并验收。

### Task 1: 冻结视觉基线与验收口径

**Files:**
- Modify: `frontend/e2e/responsive-visual.spec.ts`
- Modify: `frontend/test/app-shell.test.ts`
- Modify: `frontend/test/canvas-viewport.test.ts`
- Create: `docs/release/2026-03-14-ui-baseline.md`
- Reference: `frontend/e2e/responsive-visual.spec.ts-snapshots/*`

**Step 1: 先写基线说明文档**

- 新建 `docs/release/2026-03-14-ui-baseline.md`。
- 记录当前桌面 / 平板 / 手机的关键问题截图与文字标准：
  - 桌面头部拥挤
  - 空画布无引导
  - 浅色主题辨识度弱
  - 手机层级清楚但视觉偏平

**Step 2: 先补壳层结构测试**

- 在 `frontend/test/app-shell.test.ts` 中增加对以下结构的断言：
  - 桌面模式存在清晰的 header 主区域和 status 区域
  - 手机模式只保留必要顶栏与底部导航
- 这些测试先按目标结构写，允许当前实现先失败。

**Step 3: 先补画布空状态测试**

- 在 `frontend/test/canvas-viewport.test.ts` 中新增“空场景时显示引导层；有对象时隐藏”的断言。
- 目标是给后续引导层一个稳定 contract。

**Step 4: 锁定响应式快照入口**

- 在 `frontend/e2e/responsive-visual.spec.ts` 中增加桌面空场景、手机空场景、桌面深色主题三组快照断言。
- 后续所有 UI 改版都以这个 spec 为视觉回归门禁。

**Step 5: 跑测试确认基线红 / 绿状态**

Run: `npm run test:frontend -- app-shell canvas-viewport`

Run: `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- frontend/e2e/responsive-visual.spec.ts`

Expected:
- 结构 / 空状态测试在改版前部分失败，证明门禁真实有效。
- 当前视觉快照被保存为“改版前基线”。

**Step 6: Commit**

```bash
git add docs/release/2026-03-14-ui-baseline.md frontend/test/app-shell.test.ts frontend/test/canvas-viewport.test.ts frontend/e2e/responsive-visual.spec.ts
git commit -m "test: lock ui refresh baseline"
```

### Task 2: 重做设计 token、字体与主题语言

**Files:**
- Modify: `styles/theme.css`
- Modify: `styles/main.css`
- Modify: `styles/components.css`
- Modify: `frontend/src/main.ts`
- Test: `frontend/test/tokens.test.ts`

**Step 1: 先写失败的 token 测试**

- 在 `frontend/test/tokens.test.ts` 中新增断言，要求主题 token 至少包含：
  - shell 背景层级
  - 画布舞台层级
  - 教学强调色
  - 状态条颜色
  - 手机导航激活态颜色
- 当前实现若缺少这些命名，测试先失败。

**Step 2: 重组 `styles/theme.css` token**

- 把现有 token 从“通用深浅色”升级为“壳层语义 token”：
  - `--shell-bg`
  - `--shell-surface`
  - `--canvas-stage-bg`
  - `--canvas-grid-major`
  - `--canvas-grid-minor`
  - `--status-strip-bg`
  - `--teaching-accent`
  - `--action-primary-bg`
- 保留旧 token 作为兼容层，但逐步把主要组件迁到新 token。

**Step 3: 统一字体层级**

- 在 `styles/theme.css` 中定义 display / body / mono 三套字体变量。
- 去掉直接写死的 `'Segoe UI'` 和 `'Courier New'`，改为变量引用。
- 如果引入新字体，优先使用自托管 `woff2` 或稳定 CDN；不要把字体策略散落到组件里。

**Step 4: 调整主题风格**

- 深色主题：强化“实验观测台”方向，让工具栏、舞台、状态条更统一。
- 浅色主题：不要继续走普通办公软件灰白，改为带轻微蓝灰倾向的“实验白板”。
- 保持深浅主题语义一致，而不是两套互不相干的 UI。

**Step 5: 跑验证**

Run: `npm run test:frontend -- tokens`

Expected: token 测试通过，且全局样式文件不再直接依赖旧系统字体字面量。

**Step 6: Commit**

```bash
git add styles/theme.css styles/main.css styles/components.css frontend/src/main.ts frontend/test/tokens.test.ts
git commit -m "feat: refresh ui tokens and theme language"
```

### Task 3: 重构桌面头部的信息架构与操作分组

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/components/HeaderActionButtons.vue`
- Modify: `frontend/src/components/HeaderStatusAndSettings.vue`
- Modify: `frontend/src/components/SceneSettingsControls.vue`
- Create: `frontend/src/components/HeaderModeStrip.vue`
- Test: `frontend/test/app-shell.test.ts`
- Test: `frontend/test/header-action-buttons.test.ts`
- Test: `frontend/test/header-status-and-settings.test.ts`

**Step 1: 先写失败的 header 结构测试**

- 在 `frontend/test/app-shell.test.ts` 与 `frontend/test/header-action-buttons.test.ts` 中新增目标结构断言：
  - 主动作组：播放 / 重置
  - 场景动作组：保存 / 读取 / 导入 / 导出
  - 教学工具组：变量 / 题板 / 演示
  - 模式状态条：当前模式、对象数、粒子数、提示文本

**Step 2: 新建 `HeaderModeStrip.vue`**

- 负责渲染：
  - 当前模式标签（编辑 / 演示 / 课堂）
  - 简要状态文案
  - 对象与粒子计数
- 让模式信息不再散在 header 和 footer 两头。

**Step 3: 精简 `HeaderActionButtons.vue`**

- 改成分组渲染，而不是一整排等权按钮。
- 明确主按钮只保留 1-2 个视觉重点：
  - `播放 / 暂停`
  - `退出演示` 或 `课堂演示`
- 次级按钮统一为 ghost / quiet 风格。

**Step 4: 压缩 `HeaderStatusAndSettings.vue` 与 `SceneSettingsControls.vue`**

- 默认只露出最常用的参数：
  - 显示能量
  - 比例尺
  - 重力
  - 边界
- 时间步长与缓冲参数移动到可折叠“更多场景参数”或紧凑次级区。
- 目标是让桌面头部在 `1280px` 宽度下不需要横向滚动。

**Step 5: 在 `App.vue` 中重排 header**

- 左侧：产品名 + mode strip
- 中部：主动作组
- 右侧：场景参数与教学工具组
- 保留手机条件分支，但桌面布局改成更清晰的多段式结构。

**Step 6: 跑验证**

Run: `npm run test:frontend -- app-shell header-action-buttons header-status-and-settings scene-settings-controls`

Expected: header 结构测试通过，按钮事件 contract 不变。

**Step 7: Commit**

```bash
git add frontend/src/App.vue frontend/src/components/HeaderActionButtons.vue frontend/src/components/HeaderStatusAndSettings.vue frontend/src/components/SceneSettingsControls.vue frontend/src/components/HeaderModeStrip.vue frontend/test/app-shell.test.ts frontend/test/header-action-buttons.test.ts frontend/test/header-status-and-settings.test.ts
git commit -m "feat: restructure desktop header hierarchy"
```

### Task 4: 为画布补齐空状态与首次使用引导

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/components/CanvasViewport.vue`
- Create: `frontend/src/components/CanvasEmptyState.vue`
- Modify: `styles/main.css`
- Test: `frontend/test/canvas-viewport.test.ts`
- Test: `frontend/test/app-shell.test.ts`
- Test: `frontend/e2e/core-path.spec.ts`

**Step 1: 先写失败的 empty state 行为测试**

- 覆盖：
  - 无对象时显示引导层
  - 开始播放但仍无对象时，引导层文案变化为“先添加对象”
  - 有对象后自动隐藏

**Step 2: 新建 `CanvasEmptyState.vue`**

- 组件内容只做三件事：
  - 告知当前模式
  - 给出第一步操作
  - 提示 1-2 个快捷入口
- 桌面示例文案：
  - “从左侧组件库选择一个场”
  - “或直接载入预设场景开始讲解”
- 手机示例文案：
  - “点底部‘添加’开始搭建场景”

**Step 3: 在 `CanvasViewport.vue` 中叠加引导层**

- 空状态层位于 FPS 之上、画布交互层之下。
- 不遮挡播放后产生的物理对象，也不阻止用户直接点击画布。

**Step 4: 让 `App.vue` 透传必要只读状态**

- 至少透传：
  - `objectCount`
  - `running`
  - `isPhoneLayout`
  - `showAuthoringControls`

**Step 5: 补一条真实链路 e2e**

- 在 `frontend/e2e/core-path.spec.ts` 中新增：
  - 初始空场景看到引导
  - 添加一个对象后引导消失

**Step 6: 跑验证**

Run: `npm run test:frontend -- canvas-viewport app-shell`

Run: `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- frontend/e2e/core-path.spec.ts`

Expected: 空状态 contract 与主链路都通过。

**Step 7: Commit**

```bash
git add frontend/src/App.vue frontend/src/components/CanvasViewport.vue frontend/src/components/CanvasEmptyState.vue styles/main.css frontend/test/canvas-viewport.test.ts frontend/test/app-shell.test.ts frontend/e2e/core-path.spec.ts
git commit -m "feat: add canvas empty state onboarding"
```

### Task 5: 升级桌面工具栏与预设区表现

**Files:**
- Modify: `frontend/src/components/DesktopToolbarSidebar.vue`
- Modify: `frontend/src/components/ToolbarPanel.vue`
- Modify: `styles/main.css`
- Test: `frontend/test/desktop-toolbar-sidebar.test.ts`
- Test: `frontend/test/toolbar-panel.test.ts`
- Test: `frontend/e2e/responsive-visual.spec.ts`

**Step 1: 先写失败的工具栏层级测试**

- 断言工具栏具备：
  - 明确的分组标题层级
  - 当前激活工具的可见状态
  - 预设场景作为独立区域，不与组件列表混淆

**Step 2: 强化 `DesktopToolbarSidebar.vue` 的顶部说明**

- 把当前说明改成更有操作性的短文案，不重复组件库标题。
- 例如：
  - “添加场、粒子或预设，从空白画布开始搭建演示”

**Step 3: 优化 `ToolbarPanel.vue` 的分组节奏**

- 扩大组与组之间的视觉间距。
- 激活项不只靠细边框变化，可加入更明确的底色 / 左侧发光条 / 微位移。
- 保留当前 collapse 机制，不改行为 contract。

**Step 4: 重做预设区**

- 让预设按钮更像“教学起点”而不是普通列表按钮。
- 至少区分：
  - 基础运动
  - 经典实验
- 若不想新增分类，至少给 3 个预设更强的视觉优先级。

**Step 5: 跑验证**

Run: `npm run test:frontend -- desktop-toolbar-sidebar toolbar-panel`

Run: `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- frontend/e2e/responsive-visual.spec.ts`

Expected: 工具栏结构测试与视觉回归通过。

**Step 6: Commit**

```bash
git add frontend/src/components/DesktopToolbarSidebar.vue frontend/src/components/ToolbarPanel.vue styles/main.css frontend/test/desktop-toolbar-sidebar.test.ts frontend/test/toolbar-panel.test.ts frontend/e2e/responsive-visual.spec.ts
git commit -m "feat: refine toolbar hierarchy and preset presentation"
```

### Task 6: 优化手机端层级、sheet 节奏与状态表达

**Files:**
- Modify: `frontend/src/components/PhoneBottomNav.vue`
- Modify: `frontend/src/components/HeaderStatusAndSettings.vue`
- Modify: `frontend/src/components/PhoneSceneSheet.vue`
- Modify: `frontend/src/components/PhoneAddSheet.vue`
- Modify: `frontend/src/components/PhoneMoreSheet.vue`
- Modify: `frontend/src/components/PhoneAuthoringSheets.vue`
- Modify: `styles/main.css`
- Modify: `styles/components.css`
- Test: `frontend/test/phone-authoring-sheets.test.ts`
- Test: `frontend/test/phone-scene-sheet.test.ts`
- Test: `frontend/test/phone-more-sheet.test.ts`
- Test: `frontend/e2e/touch-core-path.spec.ts`

**Step 1: 先写手机层级目标测试**

- 断言：
  - 底部导航激活态更明显
  - 场景 sheet 打开时标题与关闭动作固定可见
  - 状态条在空场景与演示模式下文案清晰不截断

**Step 2: 调整 `PhoneBottomNav.vue` 的视觉层级**

- 强化当前 tab 的 active 态。
- 让主播放按钮在视觉上与其他 4 个按钮明显区分。
- 保持 5 键结构，不改变现有主链路记忆。

**Step 3: 精简手机顶部状态**

- `HeaderStatusAndSettings.vue` 仅保留最关键的模式与数量信息。
- 避免在手机顶区重复展示用户已能从底部 / sheet 中获取的信息。

**Step 4: 统一 sheet 头部语言**

- `PhoneSceneSheet.vue`、`PhoneAddSheet.vue`、`PhoneMoreSheet.vue` 的头部统一为：
  - 标题
  - 简短副提示（可选）
  - 关闭按钮
- 避免某些 sheet 像对话框，某些又像抽屉，保持手势语义一致。

**Step 5: 优化手机表单节奏**

- 缩短不必要的说明文，扩大区块间留白。
- 对最常用参数行做更明确的分隔，不要让所有控制项等权堆叠。

**Step 6: 跑验证**

Run: `npm run test:frontend -- phone-authoring-sheets phone-scene-sheet phone-more-sheet`

Run: `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- frontend/e2e/touch-core-path.spec.ts`

Expected: 手机主链路与触控尺寸测试持续通过，视觉层级显著提升。

**Step 7: Commit**

```bash
git add frontend/src/components/PhoneBottomNav.vue frontend/src/components/HeaderStatusAndSettings.vue frontend/src/components/PhoneSceneSheet.vue frontend/src/components/PhoneAddSheet.vue frontend/src/components/PhoneMoreSheet.vue frontend/src/components/PhoneAuthoringSheets.vue styles/main.css styles/components.css frontend/test/phone-authoring-sheets.test.ts frontend/test/phone-scene-sheet.test.ts frontend/test/phone-more-sheet.test.ts frontend/e2e/touch-core-path.spec.ts
git commit -m "feat: improve phone shell hierarchy and sheets"
```

### Task 7: 建立统一动效语言并补足 reduced-motion

**Files:**
- Modify: `styles/animations.css`
- Modify: `styles/main.css`
- Modify: `styles/components.css`
- Modify: `frontend/src/components/CanvasEmptyState.vue`
- Modify: `frontend/src/components/HeaderModeStrip.vue`
- Test: `frontend/test/app-shell.test.ts`
- Test: `frontend/e2e/responsive-visual.spec.ts`

**Step 1: 清点并收敛动画 token**

- 现有 `styles/animations.css` 中通用动画较多，但缺少真正用于壳层的语义动画。
- 将其收敛为有限集合：
  - shell enter
  - sheet rise
  - status pulse
  - tool active
- 删除或停用无明确用途的装饰性动画类。

**Step 2: 给高价值节点加动效**

- 只给以下节点加动画：
  - 空状态引导淡入
  - 手机 sheet 打开 / 关闭
  - active tool / active nav 切换
  - 模式切换时的 status strip 更新

**Step 3: 全面检查 `prefers-reduced-motion`**

- 保证新增动效在 reduced motion 下退化为短时透明度切换或无动画。
- 不允许因动效导致布局跳动。

**Step 4: 跑验证**

Run: `npm run test:frontend -- app-shell`

Run: `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- frontend/e2e/responsive-visual.spec.ts`

Expected: 动效增强不影响回归快照稳定性，reduced motion 分支仍保留。

**Step 5: Commit**

```bash
git add styles/animations.css styles/main.css styles/components.css frontend/src/components/CanvasEmptyState.vue frontend/src/components/HeaderModeStrip.vue frontend/test/app-shell.test.ts frontend/e2e/responsive-visual.spec.ts
git commit -m "feat: add purposeful shell motion"
```

### Task 8: 收尾验收、快照更新与文档回填

**Files:**
- Modify: `frontend/e2e/responsive-visual.spec.ts-snapshots/*`
- Modify: `README.md`
- Modify: `TESTING-GUIDE.md`
- Modify: `docs/release/2026-03-14-ui-baseline.md`

**Step 1: 更新快照**

- 在桌面 / 平板 / 手机 / 深色主题下重新生成视觉快照。
- 仅在确认新 UI 达标后接受 snapshot 更新。

**Step 2: 回填文档**

- `README.md` 增加 1 段 UI 改版后的产品表达。
- `TESTING-GUIDE.md` 增加“UI 改版时必须跑的前端验证清单”。
- `docs/release/2026-03-14-ui-baseline.md` 补写“改版后结果”。

**Step 3: 跑最终验证**

Run: `npm run lint:frontend`

Run: `npm run typecheck:frontend`

Run: `npm run test:frontend`

Run: `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- frontend/e2e/core-path.spec.ts frontend/e2e/touch-core-path.spec.ts frontend/e2e/responsive-visual.spec.ts`

Expected:
- lint / typecheck / unit / e2e 全绿
- 新快照体现桌面和手机层级提升
- 无核心交互回归

**Step 4: Commit**

```bash
git add frontend/e2e/responsive-visual.spec.ts-snapshots README.md TESTING-GUIDE.md docs/release/2026-03-14-ui-baseline.md
git commit -m "docs: finalize ui refresh rollout notes"
```

## Risks And Guardrails

- **风险：头部重构影响既有按钮事件 contract**
  - Guardrail: 先锁 `header-action-buttons` 与 `header-status-and-settings` 单测，再做结构重排。

- **风险：空状态层遮挡画布交互**
  - Guardrail: empty state 仅在空场景显示，且默认 `pointer-events: none`，必要按钮单独开交互。

- **风险：手机端视觉优化牺牲触控可用性**
  - Guardrail: 所有手机改动都必须复跑现有 44px touch target 和 safe-area e2e。

- **风险：深浅主题分叉成两套平行实现**
  - Guardrail: 先建语义 token，再改组件，不直接写主题专属魔法数字。

- **风险：动效变多但缺少统一规则**
  - Guardrail: 只保留 3-4 种高价值动效，不引入装饰性 bounce / shake。

## Verification Matrix

- Shell structure:
  - `npm run test:frontend -- app-shell header-action-buttons header-status-and-settings`
- Canvas onboarding:
  - `npm run test:frontend -- canvas-viewport`
  - `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- frontend/e2e/core-path.spec.ts`
- Toolbar and theme:
  - `npm run test:frontend -- tokens desktop-toolbar-sidebar toolbar-panel`
  - `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- frontend/e2e/responsive-visual.spec.ts`
- Phone UX:
  - `npm run test:frontend -- phone-authoring-sheets phone-scene-sheet phone-more-sheet`
  - `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- frontend/e2e/touch-core-path.spec.ts`
- Final release confidence:
  - `npm run lint:frontend`
  - `npm run typecheck:frontend`
  - `npm run test:frontend`
  - `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- frontend/e2e/core-path.spec.ts frontend/e2e/touch-core-path.spec.ts frontend/e2e/responsive-visual.spec.ts`

## Recommended Execution Order

1. `Task 1` 锁基线，不然后续“好不好看”会变成纯主观争论。
2. `Task 2` 先收敛 token，再做组件级重构。
3. `Task 3` 与 `Task 4` 先做桌面主舞台，因为这是当前问题最集中的区域。
4. `Task 5` 在桌面层级稳定后做工具栏强化。
5. `Task 6` 再处理手机端，避免桌面与手机同时大改增加回归面积。
6. `Task 7` 最后做动效，不要用动画掩盖结构问题。
7. `Task 8` 统一收尾。

Plan complete and saved to `docs/plans/2026-03-14-ui-refresh-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - 我按任务逐段实现、每段跑回归、边改边复查。

**2. Parallel Session (separate)** - 新开会话按 `executing-plans` 批量推进，我在当前线程只负责审核和收口。

如果你愿意，我下一步可以直接按 `Task 1` 开始做。
