# Vue Testing And Legacy Cleanup Plan

Date: 2026-02-25  
Status: Completed

## Goals

- 对 Vue 主版本建立更全面的测试护栏（组件、store、runtime、e2e）。
- 在护栏就位后，清理确认无引用的旧版前端残留模块。

## Test Matrix (Completed)

- Component contract:
  - `App` 布局根、播放切换、演示模式切换、工具栏创建对象。
  - `ToolbarPanel` registry 分组渲染契约。
  - `PropertyDrawer` schema 草稿与 apply payload 契约。
- Store behavior:
  - `simulatorStore` 运行态切换、演示模式进出恢复、预设加载、边界控制显示逻辑。
- Runtime behavior:
  - `SimulatorRuntime` 演示模式 enter/exit 对场景快照恢复。
- E2E path:
  - 启动、创建对象、播放/暂停、演示模式切换与输入禁用、退出后恢复、预设加载。

## Cleanup Scope (Phase 1, Completed)

- 已删除新版无引用模块：
  - `frontend/src/stores/sceneStore.ts`
  - `frontend/src/stores/simulationStore.ts`
  - `frontend/src/components/SimulationControls.vue`
  - `frontend/src/render/rendererBridge.ts`
  - `frontend/src/modes/demoSession.ts`
- 已删除对应旧测试：
  - `frontend/test/scene-store.test.ts`
  - `frontend/test/simulation-store.test.ts`
  - `frontend/test/demo-session.test.ts`

## Cleanup Scope (Phase 2, Completed)

- 已删除 legacy 入口与专属 UI 控制器：
  - `js/main.js`
  - `js/core/EventManager.js`
  - `js/ui/ContextMenu.js`
  - `js/ui/PropertyPanel.js`
  - `js/ui/MarkdownBoard.js`
  - `js/ui/VariableEditor.js`
  - `js/ui/Modal.js`
  - `js/ui/Toolbar.js`
  - `js/utils/Markdown.js`
  - `legacy-index.html`

## Verification

- 全流程通过：
  - `npm test`
  - `npm run test:frontend`
  - `npm run test:e2e`
  - `npm run quality:all`
  - `npm run build:frontend`
