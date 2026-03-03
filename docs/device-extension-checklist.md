# 装置类对象扩展 Checklist（V3 主线）

> 适用范围：新增“装置类对象”，例如发射器、屏幕、探测器、区域触发器等。

## 基本信息

- 对象名称：
- `type`（V3 runtime）：
- 是否需要每帧更新：
- 是否参与命中选择：
- 是否参与场景导入导出：

## 步骤清单（按接入顺序）

### 1) Domain 类型与默认值

- [ ] 在 `frontend/src/v3/domain/types.ts` 补充对象类型约束（如需新增枚举值）。
- [ ] 在 `frontend/src/v3/domain/sceneAggregate.ts` 增加默认尺寸/颜色/初始属性逻辑。
- [ ] `createObjectRecord` / `applySetObjectProps` 对新增对象字段行为正确。

### 2) 应用层命令链路

- [ ] `frontend/src/v3/application/useCases/simulatorApplication.ts` 无额外分支即可处理新增对象（优先保持通用命令）。
- [ ] 如需新增命令，补充 command bus 注册与失败语义。

### 3) 读模型与 UI 投影

- [ ] `frontend/src/v3/application/readModel/projectSceneReadModel.ts` 输出字段满足 UI 使用。
- [ ] `frontend/src/stores/modules/interactionStore.ts` 的创建别名映射包含新对象入口（如需要）。
- [ ] `frontend/src/stores/modules/interactionStore.ts` 命中检测规则覆盖新对象几何。

### 4) UI 接入

- [ ] `frontend/src/stores/modules/uiShellStore.ts` 工具栏分组包含新对象入口。
- [ ] `frontend/src/App.vue` 选择面板字段可编辑并写回（必要字段）。
- [ ] `frontend/src/components/CanvasViewport.vue` 可视化绘制与选中高亮正确。

### 5) 场景 IO 与嵌入

- [ ] `frontend/src/io/sceneSchema.ts` 校验可接受新增对象字段。
- [ ] `frontend/src/stores/modules/sceneIoStore.ts` 导入/导出路径可往返。
- [ ] `frontend/src/embed/hostBridge.ts` / `frontend/public/embed.js` 对命令回路无副作用。

### 6) 验证清单（必须）

- [ ] `npm run lint:frontend` 通过
- [ ] `npm run typecheck:frontend` 通过
- [ ] `npm run test:frontend` 通过
- [ ] `npm run test:e2e` 通过
- [ ] `npm run build:frontend` 通过
- [ ] `npm run quality:all` 通过
- [ ] 核心手测通过：创建、属性编辑、播放/暂停、导入导出、嵌入模式

## 触点总览（快速定位）

- 应用入口：`frontend/src/main.ts`
- UI 容器：`frontend/src/App.vue`
- 画布：`frontend/src/components/CanvasViewport.vue`
- Store facade：`frontend/src/stores/simulatorStore.ts`
- Store 模块：`frontend/src/stores/modules/*`
- Domain：`frontend/src/v3/domain/*`
- Application：`frontend/src/v3/application/*`
- Scene Schema：`frontend/src/io/sceneSchema.ts`
- Embed：`frontend/src/embed/*` + `frontend/public/embed.js`
