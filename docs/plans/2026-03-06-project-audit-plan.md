# 项目分区域审计方案（冲突 / Bug / UI 交互合理性）

Date: 2026-03-06  
Status: Proposed for current mainline

## 1. 审计目标

本方案用于针对当前 Vue 主线版本开展一次“按区域拆分”的系统审计，重点不是只找单点报错，而是定位以下三类问题：

1. **冲突类问题**：状态冲突、手势冲突、布局冲突、模式冲突、文档与实现冲突。
2. **Bug 类问题**：功能失效、边界条件错误、场景回放/导入导出异常、运行时与 UI 状态不一致。
3. **UI/交互不合理问题**：入口难找、操作链过长、反馈不明确、误触风险高、桌面与手机交互语义不统一。

本次审计覆盖以下维度：

- 设备维度：`desktop / tablet / phone`
- 运行维度：`standalone / embed`
- 使用维度：`authoring / running / demo`
- 层次维度：`Vue 壳层 / Store / Runtime / Legacy Engine`

## 2. 当前架构审计切入点

基于当前主线架构，建议按以下边界开展审计：

1. `frontend/src/App.vue`：唯一 UI 编排入口，属于高耦合审计中心。
2. `frontend/src/stores/simulatorStore.ts`：统一状态与动作层，是状态冲突的关键观察点。
3. `frontend/src/runtime/simulatorRuntime.ts`：Vue 与 legacy engine 的桥接层，是行为不一致与数据转换问题的高风险区。
4. `js/core/*`、`js/interactions/*`、`js/physics/*`：引擎与交互底层，是运行正确性与输入竞争的根部。

结论：本项目最适合采用“**区域审计 + 跨区域冲突矩阵**”的方式，而不是只按页面或只按技术层审计。

## 3. 分区域审计地图

### A. 应用壳层与导航编排区

**核心文件**

- `frontend/src/App.vue`
- `frontend/src/modes/useAppUiState.ts`
- `frontend/src/modes/usePhoneSheets.ts`
- `frontend/src/modes/useViewportLayout.ts`
- `frontend/src/modes/useAppShellClass.ts`
- `frontend/src/components/HeaderActionButtons.vue`
- `frontend/src/components/HeaderStatusAndSettings.vue`
- `frontend/src/components/PhoneBottomNav.vue`
- `frontend/src/components/PhoneAuthoringSheets.vue`

**审计目标**

- 确认 desktop / tablet / phone 三套布局切换时没有状态串扰。
- 确认顶部、底部导航、对象动作条、抽屉/Sheet 不会互相遮挡或抢焦点。
- 确认同一状态只存在一个“真来源”，避免多个面板开关互相覆盖。

**重点寻找的问题**

- 布局冲突：同一屏幕出现重复入口、重要按钮被遮挡、safe-area 处理不一致。
- 状态冲突：切换布局后 sheet 状态残留、抽屉关闭后 action bar 状态错误。
- 交互不合理：用户不知道当前在哪个编辑层级，关闭路径不直观。

**建议检查项**

1. 旋转屏幕或 resize 后，是否出现面板“开着但不可见”的状态。
2. 手机底栏打开某个 sheet 后，其他 sheet/抽屉是否按预期关闭。
3. Header 区与底部导航是否存在重复能力但行为不同。
4. 从空场景、单选对象、多对象、高密度对象状态进入时，壳层反馈是否一致。

**现有自动化映射**

- `frontend/test/app-shell.test.ts`
- `frontend/test/layout-mode.test.ts`
- `frontend/test/use-app-shell-class.test.ts`
- `frontend/test/use-app-ui-state.test.ts`
- `frontend/test/use-phone-sheets.test.ts`
- `frontend/test/use-viewport-layout.test.ts`
- `frontend/e2e/responsive-visual.spec.ts`

**当前高风险提示**

- `App.vue` 已承担过多布局与面板编排职责，建议作为首轮重点审计区。

### B. 画布视口与直接操作区

**核心文件**

- `frontend/src/components/CanvasViewport.vue`
- `frontend/src/components/SelectionContextMenu.vue`
- `frontend/src/components/ObjectActionBar.vue`
- `frontend/src/components/GeometryOverlayBadge.vue`
- `js/interactions/DragDropManager.js`
- `js/core/Renderer.js`
- `js/core/Scene.js`
- `js/rendering/ResponsiveSizing.js`

**审计目标**

- 确认拖拽、选中、右键、长按、手柄编辑、滚轮/双指缩放之间没有输入竞争。
- 确认选中态、上下文菜单、对象动作条与画布反馈同步。
- 确认几何浮层与直接操作信息不会误导用户。

**重点寻找的问题**

- 输入冲突：拖拽对象时误触发右键菜单/长按菜单/面板关闭。
- 反馈冲突：对象已选中但动作条未出现，或菜单出现但选中对象已变化。
- UI 不合理：几何编辑反馈只对内部实现友好，对用户不够直观。

**建议检查项**

1. 桌面端鼠标拖拽、右键菜单、滚轮缩放是否互不干扰。
2. 手机端长按、拖拽、下滑关闭 sheet 手势是否互相抢占。
3. 选中对象后快速执行复制/删除/属性操作，反馈是否立即更新。
4. 几何手柄拖拽期间的 `real/display/scale` 信息是否清晰、是否会造成概念混淆。

**现有自动化映射**

- `frontend/test/canvas-viewport.test.ts`
- `frontend/test/selection-context-menu.test.ts`
- `frontend/test/object-action-bar.test.ts`
- `frontend/test/phone-geometry.test.ts`
- `frontend/e2e/core-path.spec.ts`
- `frontend/e2e/touch-core-path.spec.ts`

### C. 对象创建、工具栏与预设区

**核心文件**

- `frontend/src/components/ToolbarPanel.vue`
- `frontend/src/components/DesktopToolbarSidebar.vue`
- `frontend/src/components/PhoneAddSheet.vue`
- `frontend/src/stores/simulatorStore.ts`
- `frontend/src/runtime/simulatorRuntime.ts`

**审计目标**

- 确认桌面工具栏、手机添加面板、预设入口在语义上统一。
- 确认创建对象、双击居中创建、加载预设的行为边界清晰。
- 确认工具项在不同布局下的可发现性一致。

**重点寻找的问题**

- 语义冲突：桌面与手机都叫“添加”，但创建位置、反馈、后续选中行为不一致。
- Bug：重复点击导致对象多次创建；预设载入后选中态/视口未同步。
- UI 不合理：分组折叠层级深、目标对象难找、预设与对象入口关系不清。

**建议检查项**

1. 单击、双击、键盘 Enter 创建是否遵循一致预期。
2. 加载预设后是否自动聚焦新场景，状态栏与对象数是否同步。
3. 手机添加面板是否支持高频对象快速找到。
4. 工具栏分组折叠后是否存在“用户看不到已选类型”的状态。

**现有自动化映射**

- `frontend/test/toolbar-panel.test.ts`
- `frontend/test/desktop-toolbar-sidebar.test.ts`
- `frontend/test/phone-authoring-sheets.test.ts`
- `frontend/e2e/core-path.spec.ts`

### D. 属性编辑、变量与几何双轨区

**核心文件**

- `frontend/src/components/PropertyDrawer.vue`
- `frontend/src/components/PhoneSelectedSheet.vue`
- `frontend/src/components/VariablesPanel.vue`
- `frontend/src/components/SceneSettingsControls.vue`
- `frontend/src/runtime/simulatorRuntime.ts`
- `frontend/src/stores/simulatorStore.ts`

**审计目标**

- 确认完整属性抽屉、手机快捷编辑、场景设置、变量表之间不存在数据覆盖或字段语义不一致。
- 确认 `real/display` 双轨几何编辑与对象缩放逻辑对用户可解释。
- 确认非法输入、边界值、表达式错误都有可恢复反馈。

**重点寻找的问题**

- 数据冲突：同一字段在快捷编辑与完整表单中含义不同或刷新时机不同。
- Bug：`apply` 后 UI 未刷新、变量替换与对象属性结果不一致、字段校验静默失败。
- UI 不合理：字段分组冗长、按钮意图不明、用户难以理解“显示尺寸”和“真实尺寸”的差异。

**建议检查项**

1. 选中对象后，快捷编辑、完整属性面板、浮层显示的几何值是否一致。
2. 修改 `real` 字段时，`display` 与 `objectScale` 是否保持预期关系。
3. 修改变量表后，依赖变量的对象属性是否即时刷新且错误提示明确。
4. 输入非法值、空值、极大值、极小值时，是否给出正确回退和可理解提示。

**现有自动化映射**

- `frontend/test/property-drawer.test.ts`
- `frontend/test/variables-panel.test.ts`
- `frontend/test/scene-settings-controls.test.ts`
- `frontend/test/phone-selected-sheet.test.ts`
- `frontend/test/phone-geometry.test.ts`
- `frontend/test/simulator-store.test.ts`
- `frontend/test/simulator-runtime.test.ts`

**当前高风险提示**

- `simulatorRuntime.ts` 内部承担 schema 转换、字段构建、值 coercion、几何字段计算，是第二个首轮重点审计区。

### E. 运行控制与模式切换区

**核心文件**

- `frontend/src/components/HeaderActionButtons.vue`
- `frontend/src/modes/useAppActions.ts`
- `frontend/src/runtime/simulatorRuntime.ts`
- `js/modes/DemoMode.js`
- `js/modes/GeometryScaling.js`

**审计目标**

- 确认播放、暂停、重置、清空、演示模式切换在不同布局与不同宿主模式下语义稳定。
- 确认运行中修改时间步长、边界模式、重力等参数时没有状态错乱。

**重点寻找的问题**

- 模式冲突：编辑态、运行态、演示态、嵌入态对同一按钮产生不同副作用。
- Bug：进入/退出 demo mode 后缩放、选中态、属性面板不同步。
- UI 不合理：按钮图标相似但行为风险不同，例如“重置”和“清空”缺少区分或确认。

**建议检查项**

1. 运行中是否允许所有应允许的设置变更，禁止项是否反馈明确。
2. 从 demo mode 返回编辑态后，视口、选中态、控制条是否恢复一致。
3. 手机和桌面上的播放主按钮是否反馈一致。
4. 高风险操作是否具备足够的防误触设计。

**现有自动化映射**

- `frontend/test/header-action-buttons.test.ts`
- `frontend/test/use-app-actions.test.ts`
- `frontend/test/simulator-runtime.test.ts`
- `test/demo_mode.test.js`
- `frontend/e2e/core-path.spec.ts`

### F. 场景 IO、导入导出、预设与嵌入区

**核心文件**

- `frontend/src/io/sceneIO.ts`
- `frontend/src/io/sceneSchema.ts`
- `frontend/src/embed/embedConfig.ts`
- `frontend/src/embed/hostBridge.ts`
- `frontend/src/embed/sceneSourceResolver.ts`
- `frontend/public/embed.js`
- `frontend/public/scenes/*`
- `scripts/embed-packager.mjs`

**审计目标**

- 确认保存、读取、导入、导出、预置场景加载、embed 配置在格式与行为上统一。
- 确认 standalone 与 embed 模式下功能边界明确且失败时反馈清楚。

**重点寻找的问题**

- 数据冲突：导出内容与重新导入后的场景不等价；旧场景兼容性退化。
- 合约冲突：宿主桥接参数、viewer 启动参数与 UI 行为不一致。
- UI 不合理：导入失败缺乏解释，用户不知道是 schema 问题、版本问题还是 host 限制。

**建议检查项**

1. 导入导出 round-trip 后对象、变量、模式、视口信息是否一致。
2. embed 模式下是否错误暴露了 standalone 操作入口。
3. 缺失场景资源、无效 JSON、旧版本 JSON 是否给出可理解反馈。
4. 预设与样例场景是否真正满足教学演示路径。

**现有自动化映射**

- `frontend/test/scene-io.test.ts`
- `frontend/test/embed-bootstrap.test.ts`
- `frontend/test/embed-config.test.ts`
- `frontend/test/host-bridge.test.ts`
- `frontend/test/scene-source-resolver.test.ts`
- `frontend/e2e/embed-protocol.spec.ts`
- `test/embed_artifacts.test.js`
- `test/embed_packager.test.js`

### G. 引擎、物理正确性与性能稳定性区

**核心文件**

- `js/core/PhysicsEngine.js`
- `js/core/Scene.js`
- `js/core/Renderer.js`
- `js/physics/*`
- `js/rendering/*`
- `js/objects/*`
- `js/utils/PerformanceMonitor.js`
- `js/utils/ResetBaseline.js`

**审计目标**

- 确认物理行为、对象生命周期、渲染刷新和 UI snapshot 之间没有性能或逻辑偏差。
- 确认多对象、多粒子、连续重置、连续导入导出下系统稳定。

**重点寻找的问题**

- 逻辑冲突：引擎内部状态已变，但 store snapshot 更新滞后。
- Bug：粒子生成点错误、边界行为错误、清空场景后残留对象或动画循环。
- UI 不合理：性能下降时没有明显提示，用户误以为物理结果错误。

**建议检查项**

1. 长时间运行后 FPS、对象数、粒子数与实际视觉效果是否匹配。
2. 清空/重置/删除对象后是否存在残影、残留选中态、残留事件监听。
3. 大对象数量和高粒子密度下是否出现严重卡顿或交互冻结。
4. 基线回放与当前结果是否偏移。

**现有自动化映射**

- `test/force_calculator.test.js`
- `test/geometry_scaling.test.js`
- `test/emitter_spawn_origin.test.js`
- `test/camera_system.test.js`
- `test/perf_budget.test.js`
- `test/replay_consistency.test.js`

### H. 视觉样式、主题与可访问性区

**核心文件**

- `styles/main.css`
- `styles/components.css`
- `styles/theme.css`
- `styles/animations.css`
- `js/utils/ThemeManager.js`
- `frontend/src/components/*`

**审计目标**

- 确认桌面与手机在主题、层级、触达尺寸、状态提示、动画节奏上保持一致。
- 确认关键按钮在视觉上“能看见、能理解、敢点击”。

**重点寻找的问题**

- 视觉冲突：亮/暗主题对比不足、层级阴影混乱、同类按钮视觉权重不一致。
- 可访问性问题：触控目标过小、icon-only 按钮缺乏语义、焦点状态不明显。
- UI 不合理：主要操作与危险操作样式过近，导致误操作成本高。

**建议检查项**

1. 手机端所有高频按钮触达高度是否满足 `>=44px`。
2. icon-only 按钮是否具备明确标签与 hover/focus/pressed 反馈。
3. 亮暗主题切换后是否存在文本不可读、边框消失、浮层层级错误。
4. 页面滚动、面板滚动、背景锁定是否符合预期。

**现有自动化映射**

- `frontend/test/tokens.test.ts`
- `frontend/test/app-status-footer.test.ts`
- `frontend/e2e/responsive-visual.spec.ts`
- `frontend/e2e/touch-core-path.spec.ts`

## 4. 冲突类型矩阵

每个区域都要显式检查以下冲突类型，避免只记“现象”不记“根因类型”：

| 冲突类型 | 定义 | 典型表现 |
| --- | --- | --- |
| 状态冲突 | Store、Runtime、Engine 的同一事实不一致 | UI 已显示选中，实际对象已删除 |
| 输入冲突 | 同一输入被多个系统消费 | 长按本想打开菜单，却触发拖拽或关 panel |
| 布局冲突 | 多个层级争夺屏幕空间或视觉主次 | 底栏、sheet、动作条同时出现导致遮挡 |
| 数据冲突 | 同一字段在不同入口含义不同 | `real`、`display`、缩放值互相覆盖 |
| 模式冲突 | 编辑/运行/demo/embed 下同一动作副作用不同 | 同一按钮在某模式可用、另一模式静默失效 |
| 文档冲突 | README / guide / UI 实际行为不一致 | 文档说可直接打开，实际必须走 Vite |

## 5. 审计执行流程

### Phase 0：基线确认

1. 确认当前分支、提交、Node 版本、浏览器版本。
2. 运行基础启动链路，保证审计对象不是“环境故障”。
3. 记录审计环境：桌面浏览器、手机模拟器、真实触控设备（如有）。

### Phase 1：静态结构审计

1. 读取 `README.md`、`TESTING-GUIDE.md`、`docs/migration/current-vue-architecture.md`。
2. 建立“区域 -> 文件 -> 测试 -> 风险类型”映射表。
3. 先识别高耦合点和多入口点，再进入动态验证。

### Phase 2：自动化基线审计

建议命令顺序：

```bash
npm test
npm run test:frontend
npm run test:e2e
```

涉及手机专项时追加：

```bash
npm run test:e2e -- --project=phone-chromium
npm run test:e2e -- --project=phone-chromium --grep "density|landscape|touch targets|swipe"
```

目标不是只看“通过/失败”，而是按失败归属到上述 8 个区域之一。

### Phase 3：手工分区域审计

每个区域都按以下模板执行：

1. **主路径**：按 README 所描述方式完成一次成功操作。
2. **边界路径**：空状态、极值、快速连击、布局切换、模式切换。
3. **冲突路径**：两个交互同时竞争，例如拖拽中切布局、开 panel 后切选中对象。
4. **恢复路径**：取消、回退、关闭、重新打开后是否可恢复。
5. **一致性路径**：桌面、手机、embed 是否遵循同一语义。

### Phase 4：跨区域冲突复盘

重点复盘以下交叉组合：

1. `壳层区 A` × `画布区 B`：是否存在面板与画布手势争用。
2. `工具栏区 C` × `属性区 D`：创建对象后是否自动进入合理编辑路径。
3. `模式区 E` × `IO/Embed 区 F`：运行态、demo 态、embed 态是否存在合约差异。
4. `引擎区 G` × `视觉区 H`：性能下降时 UI 是否仍给出正确、稳定反馈。

### Phase 5：缺陷归档与优先级排序

每条缺陷必须记录：

- 区域
- 冲突类型
- 复现步骤
- 预期结果
- 实际结果
- 影响设备/模式
- 初步怀疑层（Vue / Store / Runtime / Engine / CSS）
- 严重级别（P0-P3）
- 是否已有自动化覆盖

## 6. 缺陷分类建议

### P0

- 核心路径不可用：无法创建对象、无法播放、无法编辑、导入导出损坏。

### P1

- 核心路径可走但结果错误：状态错乱、关键参数不同步、模式切换破坏场景。

### P2

- UI/交互不合理：入口深、反馈弱、误触明显、跨端语义不统一，但仍可绕过。

### P3

- 样式/文案/细节问题：视觉一致性、标签准确性、轻微布局抖动。

## 7. 首轮审计优先顺序

若时间有限，建议按以下顺序推进：

1. **A 应用壳层与导航编排区**：先查面板和布局状态冲突。
2. **D 属性编辑、变量与几何双轨区**：再查数据一致性和输入校验。
3. **B 画布视口与直接操作区**：重点查手势/选择/菜单冲突。
4. **E 运行控制与模式切换区**：查运行、demo、重置、清空的副作用。
5. **F 场景 IO、导入导出、预设与嵌入区**：查 round-trip 与 host contract。
6. **G/H 区**：最后查性能、视觉一致性与可访问性。

## 8. 建议输出物

建议一次审计至少形成以下 3 份结果：

1. **区域缺陷清单**：按 A-H 分组，适合研发修复排期。
2. **跨区域冲突清单**：专门记录“不是单个页面能解释”的问题。
3. **UI 交互整改建议单**：只保留影响学习成本、操作效率、误操作风险的问题。

## 9. 针对当前项目的首轮关注点

基于当前代码结构，首轮最值得重点怀疑的地方如下：

1. `frontend/src/App.vue` 的编排复杂度较高，可能引入面板状态与布局切换冲突。
2. `frontend/src/runtime/simulatorRuntime.ts` 同时负责 schema 解析、值转换、对象属性应用与 snapshot 输出，可能出现“UI 显示值”和“运行时真实值”不一致。
3. 手机端 `PhoneAuthoringSheets` / `PhoneSelectedSheet` / `PhoneMoreSheet` 与 `swipeCloseGesture` 的组合，是手势竞争高风险区。
4. `real/display/objectScale` 三元模型对内部是合理的，但对最终用户可能解释成本偏高，是 UI 合理性重点审计项。
5. standalone 与 embed 的功能边界若没有明显 UI 提示，容易形成“用户看得见但不能用”的不合理体验。

---

该方案适合作为“本轮项目健康审计”的执行底稿。若继续推进，下一步建议直接按本方案产出一份 **首轮分区域审计结果表**，把问题按 `P0-P3` 落到具体文件和复现步骤上。
