# Optimization Baseline & Progress Snapshot

日期：2026-03-08
阶段：Task 1-5 验收快照
关联计划：`docs/plans/2026-03-08-project-optimization-master-plan.md`

## 1. 记录目的

本文件记录优化主线在 Task 1-5 完成后的可核对结果，用于回答 4 个问题：

- 质量门禁是否仍然全绿
- Task 5 的 bundle 目标是否真正达成
- Task 2-4 的拆分是否已进入可验证状态
- 后续性能/结构优化应继续从哪里推进

## 2. 最终门禁结果

本轮以最新代码重新执行完整验证链，结果如下：

- `npm run lint:frontend`：通过
- `npm run typecheck:frontend`：通过
- `npm test`：`156/156`
- `npm run test:frontend`：`238/238`
- `npm run verify:profiles:contracts`：`8/8`
- `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e`：`51 passed / 37 skipped`
- `npm run build:frontend`：通过
- `npm run verify:budgets`：**PASS**
- `npm run verify:budgets:target`：**PASS**
- `PLAYWRIGHT_VITE_PORT=4499 npm run quality:release`：通过

说明：

- E2E 的 `37 skipped` 来自既有的 project / layout 分流，不表示失败。
- 验收过程中额外发现并修复了一个真实浏览器回归：`LongPressController` 默认计时器上下文丢失，导致 phone 长按与再次选中链路异常；现已通过单测 + E2E 复核锁定。

## 3. Bundle 结果（Task 5）

以 `npm run build:frontend` 后的 `frontend/dist/assets` 为准：

- 最大 JS 资产：`katex-markdown-CHBExvYw.js` = `260,970 bytes`（`254.85 KiB`）
- `legacy-engine` chunk：`143,193 bytes`（`139.84 KiB`）
- `main` chunk：`92,221 bytes`（`90.06 KiB`）
- `vue-vendor` chunk：`69,877 bytes`（`68.24 KiB`）
- `embed-viewer` chunk：`66,091 bytes`（`64.54 KiB`）
- `authoring-panels` chunk：`11,709 bytes`（`11.43 KiB`）
- 总 JS：`644,061 bytes`（`628.97 KiB`）
- 总 CSS：`75,810 bytes`（`74.03 KiB`）

与 Task 1 基线相比：

- 最大 JS 资产从 `641,354 bytes` 降到 `260,970 bytes`
- 单个最大 chunk 减少 `380,384 bytes`（约 `371.47 KiB`，`-59.3%`）
- 入口 `main` chunk 已降到约 `90 KiB`
- `500 KiB` target budget 当前仍留有 `251,030 bytes`（`245.15 KiB`）余量

结论：

- Task 5 的核心目标已经达成：最大 JS 资产不再触发 `> 500 kB` 风险区间。
- 总 JS 体积与基线大致持平，说明这轮收益主要来自“冷路径拆分 + 热路径解耦”，而不是删除大量能力。

## 4. 结构拆分结果（Task 2-4）

### Task 2：作者态会话模型收敛

已抽离：

- `frontend/src/session/authoringSession.ts`
- `frontend/src/session/authoringSessionTransitions.ts`
- `frontend/src/stores/demoAuthoringSession.ts`

结果：

- `drawer ↔ selection ↔ demo restore` 规则被收敛为可测试纯状态转换。
- `simulatorStore` 保持外部契约兼容，但不再内嵌全部作者态恢复细节。

### Task 3：runtime/store 热区拆分

已抽离：

- `frontend/src/runtime/runtimeDemoSession.ts`
- `frontend/src/runtime/runtimeSnapshotSync.ts`
- `frontend/src/runtime/runtimeSceneIo.ts`
- `frontend/src/runtime/runtimeLifecycle.ts`

结果：

- demo session、snapshot 组装、scene IO 与 mount/unmount 生命周期已从 `simulatorRuntime.ts` 主体中分层。
- runtime 行为验证已覆盖到独立 helper，而不再只能通过单个大文件间接回归。

### Task 4：legacy engine 交互 / 渲染热点拆分

已抽离：

- `js/interactions/LongPressController.js`
- `js/interactions/ContextMenuController.js`
- `js/interactions/PointerGestureState.js`
- `js/rendering/LabelFormatting.js`
- `js/rendering/RendererLayers.js`

结果：

- long-press、context-menu、tap-chain、label formatting、field layer iteration 已有明确模块边界。
- 浏览器验收中暴露的定时器 host-context 问题，已经由 `test/long_press_controller.test.js` 固化为回归测试。

## 5. 热区现状

当前重点文件行数：

- `frontend/src/runtime/simulatorRuntime.ts`：`992`
- `frontend/src/stores/simulatorStore.ts`：`904`
- `js/interactions/DragDropManager.js`：`1692`
- `js/core/Renderer.js`：`1129`

新增拆分模块行数：

- `frontend/src/session/authoringSession.ts`：`25`
- `frontend/src/session/authoringSessionTransitions.ts`：`126`
- `frontend/src/runtime/runtimeDemoSession.ts`：`32`
- `frontend/src/runtime/runtimeSnapshotSync.ts`：`55`
- `frontend/src/runtime/runtimeSceneIo.ts`：`46`
- `frontend/src/runtime/runtimeLifecycle.ts`：`39`
- `js/interactions/LongPressController.js`：`36`
- `js/interactions/ContextMenuController.js`：`50`
- `js/interactions/PointerGestureState.js`：`19`
- `js/rendering/LabelFormatting.js`：`27`
- `js/rendering/RendererLayers.js`：`10`

结论：

- 这轮收益主要是“边界清晰化”和“热区职责下沉”，而不是一次性把大文件行数砍到很小。
- 后续若继续推进 Task 6/7，优先级应放在 profile 驱动的热路径削减，而不是继续机械拆文件。

## 6. 推荐后续动作

建议下一阶段按以下顺序推进：

1. 继续执行 Task 6，用 profile 数据给轨迹 / render 热路径设更明确的优化目标。
2. 在 `simulatorStore.ts` 上继续分离 runtime-facing actions 与 UI-only orchestration，避免 store 再次吸收横向逻辑。
3. 继续压缩 `DragDropManager.js` 与 `Renderer.js` 中仍然高度耦合的移动 / 命中 / 绘制分支。
4. 保持 `PLAYWRIGHT_VITE_PORT=4499 npm run quality:release` 作为发布前统一门禁入口。
