# Project Optimization Master Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不改变“教学 / 演示友好”产品定位的前提下，于 4 个工作周内系统性降低状态复杂度、压缩高风险大文件、提升真实浏览器性能与构建质量，并把发布验证固化为可重复门禁。

**Architecture:** 保持现有 `Vue UI -> Pinia store -> simulatorRuntime -> legacy engine` 主架构不变，优先通过“抽离纯状态模型 + 分解重逻辑模块 + 增加性能 / 构建守门”来优化，而不是进行一次性重写。优化顺序遵循“先稳态、再解耦、后提速、最后固化门禁”，确保现有教学主链路、移动端交互和 embed 能力不回归。

**Tech Stack:** Vue 3、TypeScript、Pinia、Vite、Vitest、Playwright、Node.js test runner、原生 Canvas、legacy JS engine、Markdown 文档。

## Progress Update (2026-03-08)

- **Task 1:** 已完成；构建预算脚本、target guard、发布门禁命令已落地。
- **Task 2:** 已完成；作者态会话与 demo restore 逻辑已收敛到 `frontend/src/session/*`。
- **Task 3:** 已完成；runtime snapshot / demo session / scene IO / lifecycle 已从主 runtime 中拆出。
- **Task 4:** 已完成；long-press、context-menu、tap-chain、label formatting 与 field layer 逻辑已有独立模块。
- **Task 5:** 已完成；`frontend/vite.config.ts` 的 chunk 策略已让最大 JS 资产降到 `254.85 KiB`，`npm run verify:budgets:target` 通过。

---

## Context

当前项目已经具备较成熟的功能、测试和文档体系，但仍存在四类会持续放大维护成本的风险：

1. **状态复杂度集中**：`sheet ↔ drawer ↔ selection ↔ demo mode ↔ runtime` 的恢复链虽然已可用，但仍分散在多个模块与 watcher 中。
2. **关键大文件过重**：`frontend/src/runtime/simulatorRuntime.ts`、`frontend/src/stores/simulatorStore.ts`、`js/interactions/DragDropManager.js`、`js/core/Renderer.js` 已形成未来优化和排障瓶颈。
3. **性能与包体仍有优化空间**：高压浏览器 render profile 在开启轨迹时存在明显长任务；生产构建仍有主 chunk 过大警告。
4. **门禁治理可继续升级**：项目已有很强测试覆盖，但“构建预算 / profile 目标 / 发布验证矩阵”还可以进一步制度化。

本方案把已有审计结论、性能治理文档、移动端规范和发布前 checklist 收敛成一条可执行主线，目标是避免继续“修单点问题”，转而建设可持续的质量系统。

## Approach Options

### Option A — 治理优先、渐进重构（推荐）

- 先冻结质量基线，再抽离会话态与 runtime/store 热区，随后处理 bundle/perf，最后固化发布门禁。
- **优点**：回归风险最低，最适合当前已有大规模测试与审计资产的项目。
- **缺点**：前两周用户可感知提升不如“直接追 FPS”明显。

### Option B — 架构优先、先拆大文件

- 先全面分解 `simulatorRuntime` / `simulatorStore` / `DragDropManager` / `Renderer`。
- **优点**：长期维护性收益最大。
- **缺点**：短期回归面积大，对节奏控制要求高。

### Option C — 性能优先、直接追 FPS 与包体

- 先做 code splitting、轨迹采样、渲染分层和 profile 优化。
- **优点**：最容易产出直观数字改进。
- **缺点**：如果状态链和模块边界不先收敛，性能修复容易变成局部补丁。

**Recommendation:** 采用 Option A，并在第 3 阶段吸收 Option C 的性能动作。

## Success Metrics

以下指标作为本轮优化完成标准：

- 质量门禁持续通过：
  - `npm run lint:frontend`
  - `npm run typecheck:frontend`
  - `npm test`
  - `npm run test:frontend`
  - `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e`
  - `npm run build:frontend`
- 文件复杂度目标：
  - `frontend/src/runtime/simulatorRuntime.ts` 从 1000+ LOC 降到 `< 700`
  - `frontend/src/stores/simulatorStore.ts` 从 800+ LOC 降到 `< 650`
  - `js/interactions/DragDropManager.js` 从 1700+ LOC 降到 `< 1100`
  - `js/core/Renderer.js` 从 1100+ LOC 降到 `< 850`
- 构建目标：作者入口构建不再出现 `> 500 kB` 主 chunk 警告。
- 浏览器性能目标：
  - `npm run profile:browser-render` 中 `high-emission-trajectories-off` 的 `avgFps >= 30`
  - `npm run profile:browser-render` 中 `high-emission-trajectories-on` 的 `avgFps >= 24`
  - `high-emission-trajectories-on` 的 `longTaskCount` 相比当前基线下降 `>= 25%`
- 产品目标：A-H 审计主链路无新增回归；手机端 touch / sheet / safe-area 用例继续通过。

## Phase Timeline

- **Phase 0（0.5 周）**：冻结基线、补齐预算门禁、统一验证矩阵。
- **Phase 1（1 周）**：收敛作者态 / demo / sheet / drawer / selection 状态链。
- **Phase 2（1 周）**：拆分 runtime/store 与 engine 热区大文件。
- **Phase 3（1 周）**：优化 bundle、冷路径加载与轨迹渲染性能。
- **Phase 4（0.5 周）**：收尾验证、文档回填、发布前复核。

### Task 1: 冻结当前基线与优化门禁

**Files:**
- Modify: `package.json`
- Modify: `TESTING-GUIDE.md`
- Modify: `docs/plans/2026-03-08-performance-baseline-governance.md`
- Create: `scripts/check-build-budget.mjs`
- Create: `test/build_budget.test.js`
- Create: `docs/release/2026-03-08-optimization-baseline.md`
- Reference: `docs/plans/2026-03-08-project-audit-final-report.md`

**Step 1: 固化当前基线数据**

- 按当前门禁命令重新生成一份基线记录，至少包含：测试通过数、构建产物大小、browser render profile 关键值、当前大文件 LOC。
- 将结果写入 `docs/release/2026-03-08-optimization-baseline.md`，作为后续比较的唯一口径。

**Step 2: 先写失败的构建预算测试**

- 在 `test/build_budget.test.js` 中新增预算断言：任意作者主入口 JS chunk 不得超过设定阈值。
- 当前主 chunk 已超阈值，预期此测试在引入 code splitting 前先失败。

**Step 3: 实现可复用的预算检查脚本**

- 创建 `scripts/check-build-budget.mjs`，读取 `dist/assets/*.js` 并输出统一的 budget 结果。
- 目标是让“构建过大”成为明确失败，而不是只看 Vite warning。

**Step 4: 把预算检查接入脚本入口**

- 在 `package.json` 中新增：
  - `verify:budgets`
  - `quality:release`（在现有 `quality:all` 基础上串联预算与 profile 抽样检查）

**Step 5: 更新测试指南**

- 在 `TESTING-GUIDE.md` 中补充“预算门禁 / release 门禁 / 基线比对”的执行顺序。

**Step 6: 跑验证**

Run: `npm run build:frontend && node --test test/build_budget.test.js`

Expected: 在真正开始 bundle 优化前，预算测试先红，证明门禁生效。

**阶段完成标准**

- 项目从“看到 warning”升级为“预算超标即失败”。
- 后续所有优化都有统一的前后对照基线。

### Task 2: 抽离作者态会话模型，收敛高风险状态链

**Files:**
- Create: `frontend/src/session/authoringSession.ts`
- Create: `frontend/src/session/authoringSessionTransitions.ts`
- Modify: `frontend/src/stores/simulatorStore.ts`
- Modify: `frontend/src/runtime/simulatorRuntime.ts`
- Modify: `frontend/src/modes/usePhoneSheets.ts`
- Modify: `frontend/src/modes/useAppUiState.ts`
- Modify: `frontend/src/App.vue`
- Test: `frontend/test/simulator-store.test.ts`
- Test: `frontend/test/simulator-runtime.test.ts`
- Test: `frontend/test/use-phone-sheets.test.ts`
- Test: `frontend/test/app-shell.test.ts`

**Step 1: 先补失败的恢复链 contract 测试**

- 覆盖以下链路：
  - `selected -> property -> close -> selected`
  - `more -> markdown -> close -> more`
  - `more -> variables -> close -> more`
  - `edit -> demo -> edit`（恢复 selection / property / selected sheet）
- 所有测试都用“结果状态”断言，避免耦合 watcher 执行顺序。

**Step 2: 创建纯会话态模型**

- 在 `frontend/src/session/authoringSession.ts` 中定义 authoring session 的最小状态模型。
- 在 `frontend/src/session/authoringSessionTransitions.ts` 中实现纯函数式 transition helper。

**Step 3: 把恢复逻辑从 watcher 拉回显式 transition**

- `simulatorStore`、`usePhoneSheets`、`useAppUiState` 和 `simulatorRuntime` 只负责调用 transition helper。
- 禁止继续在多个 watcher 中复制“如果 X 就恢复 Y”的语义补丁。

**Step 4: 保持 UI 接口不变**

- `App.vue` 与现有组件事件 contract 尽量不变，减少表层组件跟着重写。

**Step 5: 跑定向与全量前端回归**

Run: `npm run test:frontend -- simulator-store simulator-runtime use-phone-sheets app-shell`

Expected: 恢复语义稳定，相关回归全绿，且不新增脆弱 watcher 逻辑。

**阶段完成标准**

- A / D / E 交界状态链可以用一句话描述清楚。
- “为什么关闭这个面板后会回到那里”不再需要追多个 watcher 才能解释。

### Task 3: 分解 runtime/store 热区，降低前端壳层复杂度

**Files:**
- Create: `frontend/src/runtime/runtimeLifecycle.ts`
- Create: `frontend/src/runtime/runtimeSceneIo.ts`
- Create: `frontend/src/runtime/runtimeDemoSession.ts`
- Create: `frontend/src/runtime/runtimeSnapshotSync.ts`
- Modify: `frontend/src/runtime/simulatorRuntime.ts`
- Create: `frontend/src/stores/storeActions/sceneActions.ts`
- Create: `frontend/src/stores/storeActions/uiActions.ts`
- Modify: `frontend/src/stores/simulatorStore.ts`
- Test: `frontend/test/simulator-runtime.test.ts`
- Test: `frontend/test/simulator-store.test.ts`
- Test: `frontend/test/scene-io.test.ts`
- Test: `frontend/test/use-app-actions.test.ts`

**Step 1: 冻结 runtime/store 外部 contract**

- 先补测试，锁住 `simulatorRuntime` 与 `simulatorStore` 当前对外公开的方法与关键副作用。
- 本任务目标是“内部拆分”，不是“改外部 API”。

**Step 2: 先拆纯 helper，再拆副作用模块**

- 先把 scene IO、demo session、snapshot sync、mount/unmount 生命周期拆成独立文件。
- 保留 `simulatorRuntime.ts` 作为薄入口，只做聚合与依赖注入。

**Step 3: 分离 store 的 scene actions 与 UI actions**

- 把面向 runtime 的动作与面向 UI 的状态切换从 `simulatorStore.ts` 中拆开。
- 目标是让 store 更像“编排层”，而不是“所有逻辑的最终落点”。

**Step 4: 清理重复状态同步**

- 合并重复的 status text、selection 同步、panel 打开 / 关闭更新路径。
- 拆分后若出现功能重叠 helper，立即合并，不保留平行分支。

**Step 5: 跑验证**

Run: `npm run test:frontend -- simulator-runtime simulator-store scene-io use-app-actions && npm run typecheck:frontend`

Expected: store/runtime 行为保持不变，但主文件 LOC 和职责显著下降。

**阶段完成标准**

- `simulatorRuntime.ts` 只保留薄编排职责。
- `simulatorStore.ts` 从“超大状态+动作混合体”收敛为清晰的 orchestrator。

### Task 4: 分解 engine 交互与渲染热点，降低 legacy 核心维护成本

**Files:**
- Create: `js/interactions/PointerGestureState.js`
- Create: `js/interactions/LongPressController.js`
- Create: `js/interactions/ContextMenuController.js`
- Modify: `js/interactions/DragDropManager.js`
- Create: `js/rendering/RendererLayers.js`
- Create: `js/rendering/LabelFormatting.js`
- Modify: `js/core/Renderer.js`
- Modify: `js/rendering/TrajectoryRenderer.js`
- Test: `test/dragdrop_manager_dom.test.js`
- Test: `test/dragdrop_helpers.test.js`
- Test: `test/particle_centroid_hint_rendering.test.js`
- Test: `test/browser_render_profile.test.js`

**Step 1: 锁住高风险交互行为**

- 先补 DOM contract 测试，覆盖 pen / touch / long-press / pinch / context menu 的关键边界。
- 目标是让后续拆分不依赖肉眼回归判断。

**Step 2: 从 `DragDropManager.js` 抽离纯状态机**

- 将 pointer tap-chain、long-press timer、context-menu 恢复等状态抽到独立 controller。
- `DragDropManager.js` 只保留事件绑定和 orchestration。

**Step 3: 从 `Renderer.js` 抽离层职责**

- 把 label formatting、overlay / badge 计算、render layer 组装拆出去。
- `Renderer.js` 只负责渲染管线与调度，不继续承载展示细节工具函数。

**Step 4: 让 `TrajectoryRenderer.js` 成为可独立优化点**

- 抽出轨迹缓存、压缩、裁剪策略的单一入口，便于后续单独做性能优化。

**Step 5: 跑验证**

Run: `npm test && npm run profile:browser-render`

Expected: legacy engine 的外部行为不变，但交互与渲染热点可独立理解、独立 profiling。

**阶段完成标准**

- `DragDropManager.js` 和 `Renderer.js` 不再是“只能整体读”的代码块。
- pointer / render / trajectory 三类问题可以分别定位。

### Task 5: 优化 bundle 结构与冷路径加载

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/components/AuthoringPanels.vue`
- Modify: `frontend/src/components/MarkdownBoard.vue`
- Modify: `frontend/src/components/VariablesPanel.vue`
- Modify: `frontend/vite.config.ts`
- Test: `frontend/test/markdown-board.test.ts`
- Test: `frontend/test/variables-panel.test.ts`
- Test: `frontend/test/app-shell.test.ts`
- Test: `test/build_budget.test.js`

**Step 1: 先跑失败的预算门禁**

- 使用 Task 1 的预算测试验证当前构建仍超标，确保后续优化有明确目标。

**Step 2: 识别冷路径组件**

- 把不属于首屏刚需的作者态组件列为候选：`MarkdownBoard.vue`、变量面板、部分设置入口。
- 保持首屏创建 / 编辑 / 播放链路可立即可用。

**Step 3: 引入按需加载**

- 对冷路径组件使用异步加载。
- 尤其是 KaTeX / markdown 相关依赖，应尽量只在需要时进入作者主包。

**Step 4: 调整 Vite chunk 策略**

- 在 `frontend/vite.config.ts` 中引入更明确的 `manualChunks`，至少拆分：
  - `vue-vendor`
  - `katex-markdown`
  - `authoring-panels`
  - `embed-viewer`

**Step 5: 跑验证**

Run: `npm run build:frontend && node --test test/build_budget.test.js && npm run test:frontend -- markdown-board variables-panel app-shell`

Expected: 预算测试转绿，主入口不再出现超大 chunk 警告，作者主链路不受影响。

**阶段完成标准**

- 构建产物大小进入受控范围。
- 冷路径依赖不再拖累作者主入口。

### Task 6: 优化浏览器性能，优先处理轨迹与长任务

**Files:**
- Modify: `js/rendering/TrajectoryRenderer.js`
- Modify: `js/core/Renderer.js`
- Modify: `js/utils/PerformanceMonitor.js`
- Modify: `scripts/profile-high-emission.mjs`
- Modify: `scripts/profile-browser-render.mjs`
- Modify: `test/perf_budget.test.js`
- Modify: `test/high_emission_profile.test.js`
- Modify: `test/browser_render_profile.test.js`
- Reference: `docs/plans/2026-03-08-performance-baseline-governance.md`

**Step 1: 把当前 profile 结果转成明确门槛**

- 在 profile 相关测试中加入更明确的预算断言，而不是只验证 schema 存在。
- 优先覆盖 `avgFps`、`p95FrameMs`、`longTaskCount`。

**Step 2: 优化轨迹缓存策略**

- 对高压场景引入内部采样 / 压缩 / 剪裁策略。
- 原则是优先保持教学语义和大体视觉连续性，不为“绝对逐点精度”牺牲交互可用性。

**Step 3: 减少渲染热路径中的重复计算**

- 将 label / badge / overlay 计算移出每帧热路径，能缓存则缓存，能按 dirty state 更新就不要全量重算。

**Step 4: 让性能退化可被观测**

- `PerformanceMonitor.js` 暴露更稳定的热点统计口径，便于后续回归时快速定位是轨迹、对象数还是 UI 侧主线程压力。

**Step 5: 跑验证**

Run: `npm run profile:high-emission && npm run profile:browser-render && node --test test/perf_budget.test.js test/high_emission_profile.test.js test/browser_render_profile.test.js`

Expected: 关键场景 `avgFps`、`longTaskCount` 优于当前基线，且 profile contract 继续稳定。

**阶段完成标准**

- 轨迹开启场景不再是明显性能悬崖。
- 性能退化能被 profile 与测试直接捕获。

### Task 7: 固化测试分层、发布验证与回滚材料

**Files:**
- Modify: `package.json`
- Modify: `TESTING-GUIDE.md`
- Modify: `frontend/playwright.config.ts`
- Modify: `frontend/e2e/helpers/phoneFlows.ts`
- Modify: `frontend/e2e/helpers/assertions.ts`
- Modify: `docs/release/frontend-rewrite-launch-checklist.md`
- Modify: `docs/release/frontend-rewrite-rollback-runbook.md`
- Create: `docs/release/2026-03-08-optimization-verification-matrix.md`

**Step 1: 明确测试分层入口**

- 为本轮优化定义清晰入口：
  - smoke
  - frontend regression
  - engine regression
  - phone regression
  - release gate

**Step 2: 把 Playwright 分流规则写清楚**

- 在 `TESTING-GUIDE.md` 与 `frontend/playwright.config.ts` 附近注释 / 文档中明确 desktop / phone / tablet 的职责边界。
- `skip` 必须被解释为“设计分流”，而不是“未知原因先跳过”。

**Step 3: 生成发布验证矩阵**

- 在 `docs/release/2026-03-08-optimization-verification-matrix.md` 中列出：
  - 变更类别
  - 必跑命令
  - 可选抽样命令
  - 风险说明
  - 回滚入口

**Step 4: 收敛回滚材料**

- 把“若 bundle / performance / interaction 回归，应先回退什么”写进 rollback runbook，而不是只写通用回滚说明。

**Step 5: 跑最终验证**

Run: `npm run lint:frontend && npm run typecheck:frontend && npm test && npm run test:frontend && PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e && npm run build:frontend`

Expected: 所有门禁通过，验证矩阵与发布 / 回滚文档可直接用于提测或上线评估。

**阶段完成标准**

- 项目优化不再依赖“谁记得该跑什么”。
- 发布 / 回滚决策可以基于文档和门禁而非经验判断。

## Risks and Mitigations

- **风险：大文件拆分过程中引入行为回归**
  - 缓解：每次只拆一个职责块，先补 contract tests，再移动代码。
- **风险：bundle 优化影响首屏或作者链路**
  - 缓解：只对冷路径做异步化，首屏主链路保持同步加载。
- **风险：性能优化改变教学表现**
  - 缓解：优先优化内部缓存 / 采样策略，避免改变对象物理语义。
- **风险：计划过大、执行发散**
  - 缓解：严格按 Phase 顺序推进，不并行开启高风险重构和性能调优。

## Non-Goals

- 不进行“全面 TypeScript 化 legacy engine”式大迁移。
- 不在本轮引入新的产品功能或对象类型。
- 不为了性能而牺牲教学场景下的基本可解释性。
- 不修改现有 embed 协议语义，除非发现明确兼容性问题。

## Recommended Execution Order

1. 完成 Task 1，冻结基线与预算门禁。
2. 完成 Task 2，先稳住最易反复出错的状态链。
3. 完成 Task 3，降低 Vue 壳层复杂度。
4. 完成 Task 4，拆分 legacy engine 热区。
5. 完成 Task 5，解决构建和冷路径包体问题。
6. 完成 Task 6，追浏览器 profile 指标。
7. 完成 Task 7，做最终验证、文档与发布收口。

## Exit Criteria

当且仅当以下条件同时满足，本轮优化可判定完成：

- 所有质量门禁和 release gate 命令通过。
- 复杂度目标与构建预算目标满足。
- browser render profile 达到本计划定义的最低门槛。
- 文档、发布矩阵与回滚材料已同步更新。
- 审计主链路（桌面创建 / 编辑 / 播放 / IO / demo；手机 touch / sheet / orientation / safe-area）无新增回归。

