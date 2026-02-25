# Vue Native Runtime Design

Date: 2026-02-25
Status: Proposed

## Goal

实现真正 Vue 化：由 Vue 负责 UI、状态与生命周期，移除 `js/main.js` 作为主编排入口；保留已验证的核心引擎（`Scene`/`Renderer`/`PhysicsEngine`/对象模型）以降低物理行为回归风险。

## Scope

- In scope:
  - Vue `App` 成为唯一前端编排器。
  - 引入 `simulatorStore`（Pinia）作为统一状态与命令入口。
  - 引入 `SimulatorRuntime` 服务对象，封装引擎初始化、渲染刷新、循环、场景 IO、主题、基线重置。
  - `ToolbarPanel` 改为注册表驱动渲染。
  - `PropertyDrawer` 改为 schema 驱动（支持 `number/text/select/checkbox/expression`）。
  - 解决布局语义：`#app` 重新作为 CSS Grid 根容器，避免额外 wrapper 破坏样式。

- Out of scope:
  - 全量重写 `DragDropManager` 指针逻辑。
  - 全量替换所有 legacy 辅助 UI（例如复杂模态工作流）。

## Architecture

- Vue Layer:
  - `App.vue` 只负责布局和事件绑定。
  - `ToolbarPanel`/`CanvasViewport`/`PropertyDrawer` 作为纯视图组件。
  - `simulatorStore` 维护 UI 状态（运行、选中、面板开闭、统计）和命令（播放、创建、编辑、IO）。

- Runtime Layer:
  - `SimulatorRuntime` 封装旧引擎调用，提供稳定 API。
  - 通过回调向 store 推送快照（FPS、对象数、选中态）。
  - 提供 `requestRender`、`toggleRunning`、`createObjectAtCenter`、`applySelectedProperties` 等命令。

- Legacy Compatibility Adapter:
  - `DragDropManager` 增加可注入 `appAdapter`，避免硬编码 `window.app`。

## Data Flow

用户交互 -> Vue 组件事件 -> `simulatorStore` action -> `SimulatorRuntime` -> 引擎状态变更 -> 渲染 -> 回推快照 -> Vue 响应式更新。

## Risks and Mitigation

- 风险：属性 schema 的 `bind/visibleWhen/enabledWhen` 行为不一致。
  - 缓解：复用 `SchemaForm.js` 中公开的 `parseExpressionInput/isFieldVisible/isFieldEnabled`。
- 风险：布局回退导致 UI 再次塌陷。
  - 缓解：测试固定 `#app` 根容器语义并保留关键 DOM id。
