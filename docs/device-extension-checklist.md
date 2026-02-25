# 装置类对象扩展 Checklist（Vue 主线）

> 适用范围：新增“装置类对象”，例如发射器、屏幕、消失区、探测器等。

## 基本信息

- 对象名称：
- `data-type`（工具栏）：
- Scene 分类（`emitters / screens / disappearZones / 其他`）：
- 是否需要每帧更新（`update`）：
- 是否参与碰撞/命中/吸收：
- 需要的渲染层（`electric / magnetic / device / particle`）：

## 步骤清单（按接入顺序）

### 1) 注册表与对象定义

- [ ] 新建 `js/objects/<NewDevice>.js`（继承 `BaseObject`）
- [ ] 提供 `defaults / schema / containsPoint / serialize / deserialize`
- [ ] 在 `js/core/registerObjects.js` 注册：
  - [ ] `type / label / icon / category`
  - [ ] `rendererKey`
  - [ ] 需要时补 `physicsHooks`

### 2) 创建逻辑（Vue + 交互）

- [ ] 确认 `frontend/src/stores/simulatorStore.ts` 的工具分组能自动出现新对象
- [ ] 确认 `frontend/src/components/ToolbarPanel.vue` 渲染出新 `tool-item`
- [ ] `js/interactions/DragDropManager.js` 如需特殊创建参数，补充 `TOOL_ALIASES / CREATION_OVERRIDES`

### 3) Scene 分类与持久化

- [ ] `js/core/Scene.js`：
  - [ ] `addObject/removeObject` 分类正确
  - [ ] `serialize/loadFromData` 兼容
- [ ] `js/utils/Serializer.js`：
  - [ ] `validateSceneData` 能通过

### 4) 物理行为接入

- [ ] `js/core/PhysicsEngine.js`：
  - [ ] `update()` 已正确触发新对象行为
  - [ ] 如需新增 `handleXxx()`，确认调用时序

### 5) 渲染与交互

- [ ] `js/core/Renderer.js` 对应层可视化正确
- [ ] 选中高亮/控制点逻辑正确
- [ ] 拖拽、缩放、右键菜单与属性面板联动正常

### 6) 属性编辑（Schema 驱动）

- [ ] 对象 `schema()` 字段定义完整（`number/text/select/checkbox/expression`）
- [ ] `frontend/src/runtime/simulatorRuntime.ts` `buildPropertyPayload/applySelectedProperties` 行为正确
- [ ] `frontend/src/components/PropertyDrawer.vue` 显示与应用无异常

### 7) 预设与示例（可选）

- [ ] 在 `js/presets/Presets.js` 增加示例场景

### 8) 验证清单（必须）

- [ ] `npm test` 通过
- [ ] `npm run test:frontend` 通过
- [ ] `npm run test:e2e` 通过
- [ ] `npm run build:frontend` 通过
- [ ] 核心链路手测通过：创建、属性编辑、播放/暂停、导入导出、演示模式

## 触点总览（快速定位）

- Vue 编排：`frontend/src/App.vue`
- 统一状态：`frontend/src/stores/simulatorStore.ts`
- 运行时桥接：`frontend/src/runtime/simulatorRuntime.ts`
- 创建交互：`js/interactions/DragDropManager.js`
- 注册表：`js/core/registerObjects.js`
- 对象模型：`js/objects/`
- 场景：`js/core/Scene.js`
- 物理：`js/core/PhysicsEngine.js`
- 渲染：`js/core/Renderer.js`
- 序列化：`js/utils/Serializer.js`
- 预设：`js/presets/Presets.js`
