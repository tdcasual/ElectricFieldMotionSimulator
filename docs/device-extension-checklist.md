# 装置类对象扩展 Checklist（模板）

> 适用范围：新增“装置类对象”，例如发射器、屏幕、消失区、探测器等。

## 基本信息

- 对象名称：
- data-type（工具栏）：
- Scene 分类（emitters / screens / disappearZones / 其他）：
- 是否需要每帧更新（update）：
- 是否参与碰撞/命中/吸收：
- 需要的渲染层（field / particle / overlay）：

## 步骤清单（按接入顺序）

### 1) 工具入口（UI）

- [ ] `index.html` 添加工具栏 `tool-item`（data-type + 图标 + 文案）
- [ ] 明确触屏放置逻辑是否需要特殊行为（默认：点击武器化后落点）

### 2) 创建逻辑（拖拽/放置）

- [ ] `js/interactions/DragDropManager.js` 在 `createObject()` 增加 `case`
- [ ] 填好默认参数（与预期物理尺度一致）
- [ ] 若需要缩放/拖拽自定义规则，补充对应逻辑

### 3) 对象定义（结构与序列化）

- [ ] 新建 `js/objects/<NewDevice>.js` 继承 `BaseObject`
- [ ] 设定默认值、`containsPoint()`、`serialize()/deserialize()`
- [ ] 如需每帧行为，实现 `update(dt, scene)`

### 4) Scene 分类与持久化

- [ ] `js/core/Scene.js`：
  - [ ] `addObject/removeObject/getAllObjects` 归类
  - [ ] `serialize()` 加入数组
  - [ ] `loadFromData()` 做 type → class 映射
- [ ] `js/utils/Serializer.js`：
  - [ ] `validateSceneData()` 允许该字段（新数组/新类型）

### 5) 物理行为接入

- [ ] `js/core/PhysicsEngine.js`：
  - [ ] `update()` 调用装置逻辑（发射/碰撞/吸收/记录）
  - [ ] 需要时新增 `handleXxx()` 并确定调用顺序

### 6) 渲染与选中高亮

- [ ] `js/core/Renderer.js`：
  - [ ] `renderFields()` 或 `renderParticles()` 中绘制
  - [ ] 选中高亮与控制点（如需要）

### 7) 属性面板

- [ ] `js/ui/PropertyPanel.js`：
  - [ ] `show()` 增加分发
  - [ ] `renderXxxProperties()` + 应用按钮逻辑

### 8) 预设/示例（可选）

- [ ] `js/presets/Presets.js` 增加示例场景

### 9) 验证清单（手动）

- [ ] 拖拽创建/触屏放置正常
- [ ] 复制/删除/保存/导入正常
- [ ] 暂停/播放/重置下行为正确
- [ ] 主题切换下渲染清晰

## 触点总览（方便快速定位）

- UI：`index.html`
- 创建：`js/interactions/DragDropManager.js`
- 对象：`js/objects/`
- 场景：`js/core/Scene.js`
- 物理：`js/core/PhysicsEngine.js`
- 渲染：`js/core/Renderer.js`
- 属性：`js/ui/PropertyPanel.js`
- 校验：`js/utils/Serializer.js`
- 预设：`js/presets/Presets.js`
