# 项目第二轮审计结果（Round 2）

Date: 2026-03-07  
Status: P2 / P3 已修复（截至 2026-03-08，本轮已关闭 19 项明确问题）

## 1. 本轮范围

本轮不再重复首轮已关闭的 P1/P2，而是聚焦首轮建议中的 P3 区域，优先检查：

- D. 属性编辑、变量与几何双轨区
- F. 场景 IO、导入导出、预设与嵌入区
- G. 大场景运行稳定性与场景持久化边界区

本次实际先落修的是 **F 区错误反馈链**，因为它同时影响：

- 文件导入失败提示
- embed 启动失败提示
- host command `loadScene` 返回结果

## 2. 发现与根因

### Finding 1 — P3：场景校验细节在 runtime / store / embed bridge 之间被吞掉，用户只能看到通用失败文案

**区域**

- F. 场景 IO、导入导出、预设与嵌入区
- D. 属性/状态反馈协同区（次级影响）

**类型**

- 冲突：校验层与反馈层语义脱节
- Bug：错误详情在多层调用中丢失
- UI 不合理：用户无法判断是格式错、版本错还是字段越界

**根因链**

1. `frontend/src/embed/sceneSourceResolver.ts` 虽然能拿到 `validateSceneData()` 的 issues，但旧实现只返回通用 `Invalid scene payload`
2. `frontend/src/runtime/simulatorRuntime.ts` 的 `loadSceneData()` / `importScene()` 旧实现只返回布尔值，丢掉了 `Serializer.validateSceneData()` 的详细错误
3. `frontend/src/stores/simulatorStore.ts` 只能把失败收敛为 `场景加载失败` / `导入失败`
4. `frontend/src/embed/hostBridge.ts` 在 host `loadScene` 被拒绝时只能返回 `Scene payload was rejected.`

**用户影响**

- 导入损坏 JSON 时，用户不知道是“缺少版本信息”还是“对象字段越界”
- embed 宿主接到失败结果时，拿不到可执行的修正线索
- 审计与排障成本被推高，错误只能二次复现才能定位

## 3. 落地修复

### 3.1 结构化错误结果

- `frontend/src/runtime/simulatorRuntime.ts`
  - 为 `loadSceneData()` 引入结构化返回 `{ ok, error? }`
  - 为 `importScene()` 引入结构化返回 `{ ok, error? }`
  - 直接透传 `Serializer.validateSceneData()` / 文件读取阶段的具体错误

### 3.2 store 状态文案不再吞错

- `frontend/src/stores/simulatorStore.ts`
  - `loadSceneData()` 失败时直接显示具体错误，而非统一写成“场景加载失败”
  - `importScene()` 失败时直接显示具体错误，而非统一写成“导入失败”
  - `bootstrapFromEmbed()` 在 runtime 拒绝 payload 时直接返回底层错误文本

### 3.3 embed / host feedback 对齐

- `frontend/src/embed/sceneSourceResolver.ts`
  - 将 `validateSceneData()` 的首条 issue 拼进错误消息，保留版本/字段级线索
- `frontend/src/embed/hostBridge.ts`
  - `loadScene` host command 支持读取结构化错误并回传给宿主

## 4. 验证证据

### 4.1 定向测试

- `npm run test:frontend -- scene-source-resolver embed-bootstrap host-bridge simulator-store`
  - 通过（38/38）
- `npm run test:frontend -- simulator-store`
  - 通过（21/21）

### 4.2 回归验证

- `npm test`
  - 通过（133/133）
- `npm run test:frontend`
  - 通过（190/190）
- `PLAYWRIGHT_VITE_PORT=4599 npx playwright test -c frontend/playwright.config.ts frontend/e2e/core-path.spec.ts frontend/e2e/embed-protocol.spec.ts`
  - 通过（6/6）

## 5. 新增发现与修复（D 区）

### Finding 2 — P3：同次提交多个“显示尺寸”字段时只会应用第一项，后续字段被静默忽略

**区域**

- D. 属性编辑、变量与几何双轨区

**类型**

- 冲突：多字段显示尺寸共同指向同一个 `objectScale`，但 UI 未说明互斥关系
- Bug：runtime 旧实现只应用第一个 display 字段，后续字段被静默跳过
- UI 不合理：用户输入两个显示尺寸后看不到明确冲突提示

**根因链**

1. `frontend/src/runtime/simulatorRuntime.ts` 在 `applySelectedProperties()` 中使用 `objectScaleUpdated` 作为短路标记
2. 当一次 apply 同时提交 `width__display`、`height__display` 等多个字段时，只会应用首个字段
3. 若多个字段隐含的缩放一致，当前行为只是“碰巧正确”
4. 若多个字段隐含的缩放不一致，当前实现会静默吃掉后一个字段，不给任何错误提示

**修复动作**

- 改为先收集所有 display 字段推导出的目标缩放，再统一判定
- 若多个字段推导出的缩放一致，则统一应用一个共享缩放
- 若缩放不一致，则明确报错“显示尺寸存在冲突”，阻止静默覆盖
- 补充 runtime/store 回归测试，覆盖“一致可通过 / 冲突必须报错”两条路径

**验证证据**

- `npm run test:frontend -- simulator-runtime simulator-store`：通过（32/32）
- `npm run test:frontend`：通过（190/190）

### Finding 3 — P3：Vue 属性抽屉把 expression 当普通文本，变量表与表达式反馈脱节

**区域**

- D. 属性编辑、变量与几何双轨区

**类型**

- 冲突：Schema 与运行时已支持 expression + variables/time 求值，但 Vue 抽屉仍按普通文本字段处理
- Bug：表达式输入错误不会在属性面板内即时暴露，变量更新后也没有预览反馈
- UI 不合理：用户输入 `2*a`、`sin(t)` 或非法表达式时，看不到当前求值结果，也不知道问题出在语法还是变量缺失

**根因链**

1. `frontend/src/components/PropertyDrawer.vue` 虽然识别 `field.type === "expression"`，但旧实现只复用普通文本输入，没有解析/预览层
2. `frontend/src/components/AuthoringPanels.vue` 与 `frontend/src/App.vue` 旧链路没有把 runtime 的变量表与时间上下文传给属性抽屉
3. `frontend/src/stores/simulatorStore.ts` 旧实现只维护变量编辑草稿，没有把运行态 `scene.variables` / `scene.time` 同步给属性编辑层
4. 结果是“ƒx 变量表”与“属性抽屉 expression 字段”成了两套割裂反馈链，用户只能靠提交后结果反推表达式是否有效

**修复动作**

- `frontend/src/components/PropertyDrawer.vue` 复用 `parseExpressionInput()`，为 expression 字段增加中性提示 / 求值预览 / 错误提示
- `frontend/src/stores/simulatorStore.ts` 新增 `sceneVariables`、`sceneTime`，从 runtime 场景状态同步变量与时间上下文
- `frontend/src/App.vue`、`frontend/src/components/AuthoringPanels.vue` 打通 `store → App → AuthoringPanels → PropertyDrawer` 的上下文传递链
- 补充组件测试，覆盖“变量上下文求值预览”和“变量变化后提示自动更新”两条回归路径

**验证证据**

- `npm test`：通过（133/133）
- `npm run test:frontend`：通过（190/190）

### Finding 4 — P2：属性抽屉切到变量表 / 题板后无法回到原上下文，未提交草稿会被刷新覆盖

**区域**

- D. 属性编辑、变量与几何双轨区

**类型**

- 冲突：属性抽屉、变量表、题板共用单一 `activeDrawer`，但没有“临时切换后返回”的导航语义
- Bug：从属性抽屉切到变量表或题板后，关闭临时抽屉只会回到无抽屉状态，手动重开属性抽屉会触发 payload 刷新并覆盖未提交草稿
- UI 不合理：用户在编辑 expression 时去变量表补变量、或去题板对照题目，回来要重新打开属性面板，且输入中的临时修改可能丢失

**根因链**

1. `frontend/src/stores/simulatorStore.ts` 旧实现只用单个 `activeDrawer` 表示当前抽屉，没有记录上一个抽屉上下文
2. `closeVariablesPanel()` / `closeMarkdownBoard()` 旧逻辑都会把状态直接收敛到 `null`，不会恢复前一个 authoring surface
3. 用户只能手动再次执行 `openPropertyPanel()`，而该路径会重新 `refreshSelectedPropertyPayload()`，把未应用的属性草稿刷新回 runtime 当前值
4. `MarkdownBoard` 内容走 store 持久化，而 `PropertyDrawer` / `VariablesPanel` 草稿主要依赖组件本地状态，导致三个面板的“草稿保持”语义不一致

**修复动作**

- `frontend/src/stores/simulatorStore.ts` 为 authoring drawer 增加返回栈，允许变量表 / 题板关闭后恢复前一个抽屉上下文
- 恢复属性抽屉时增加选中对象作用域判断：若仍是同一对象，则直接回到原草稿；若选中对象已变化，则先安全刷新 payload 再打开
- 保持“属性面板主动关闭即真正关闭”的语义，避免关闭属性面板时又意外弹回其它抽屉
- 补充 store 回归测试，覆盖 `property → variables → apply → property` 与 `property → markdown → variables → markdown → property` 两条链路
- 补充组件测试，锁定 `PropertyDrawer` 在临时隐藏再打开后仍保留未提交草稿

**验证证据**

- `npm run test:frontend -- simulator-store property-drawer`：通过（35/35）

### Finding 5 — P2：变量表 / 时间推进会更新 expression 预览，但实际对象状态停留在旧值

**区域**

- D. 属性编辑、变量与几何双轨区
- G. 运行时状态同步区（次级影响）

**类型**

- 冲突：属性抽屉预览基于最新 `scene.variables` / `scene.time` 求值，但运行态对象仍停留在上一次 apply 时的数值
- Bug：变量表更新或时间推进后，expression 绑定对象不会重新求值
- UI 不合理：用户看到 `2 * a` 的预览已从 `4` 变成 `6`，但粒子真实速度仍是旧值，导致“面板说一套、场景跑一套”

**根因链**

1. `frontend/src/runtime/simulatorRuntime.ts` 在 `applySelectedProperties()` 中只在提交当下对 expression 字段执行一次 `parseExpressionInput()` + `bind.set()`
2. 之后无论是 `applyVariables()` 修改 `scene.variables`，还是运行循环推进 `scene.time`，runtime 都不会重新计算已绑定的 expression 字段
3. `frontend/src/components/PropertyDrawer.vue` 的预览逻辑会随着 `sceneVariables` / `sceneTime` 更新，因此 UI 侧先变，运行态对象值却不变
4. 以 `js/objects/Particle.js` 的 `vxExpr` / `vyExpr` 为例，旧实现会记住表达式字符串，但不会在后续 render / tick 中按需重算

**修复动作**

- `frontend/src/runtime/simulatorRuntime.ts` 新增动态 expression 刷新逻辑，遍历带 `expression + bind.get/set` 的 schema 字段并按当前 `scene.variables` / `scene.time` 重算
- 在 `requestRender()` 中执行一次刷新，保证变量表应用后、暂停态调整后，运行态对象与属性抽屉预览保持一致
- 在运行循环 `loop()` 中于物理更新前执行刷新，保证依赖 `t` 的 expression 在时间推进时也同步到实际对象状态
- 补充 runtime 回归测试，覆盖“变量变化重算”和“时间变化重算”两条路径

**验证证据**

- `npm run test:frontend -- simulator-runtime`：通过（12/12）

### Finding 6 — P3：dynamic expression 刷新在 repeated render 中重复扫 schema，并对数值 fallback 反复回写

**区域**

- G. 运行性能与大对象场景稳定性区
- D / G 交界：expression 绑定运行时同步链

**类型**

- 冲突：为修正 expression 同步而新增的 runtime 刷新链，与大场景渲染性能目标发生冲突
- Bug：同类型对象会在每次 `requestRender()` / `loop()` 中重复执行相同 schema 扫描；未激活 expression 的粒子还会反复回写数值 fallback
- UI 不合理：用户只是在变量表、属性面板或暂停态下做轻量操作，也会给大场景带来额外 CPU 开销，表现为无必要的卡顿放大

**根因链**

1. `frontend/src/runtime/simulatorRuntime.ts` 的首版 `refreshDynamicExpressionBindings()` 按“对象维度”工作，每个对象每次 render 都重新 `registry.get(type).schema()`
2. 当场景中有大量同类型对象时，schema 解析成本会随对象数线性重复，即使这些对象类型根本没有 expression 字段
3. 对 `particle` 这类带 expression schema 的对象，旧实现即使 `vxExpr` / `vyExpr` 未启用，也会把 `bind.get()` 返回的数值字符串再次 `parseExpressionInput()` 并 `bind.set()` 回对象
4. 结果是 correctness fix 已经生效，但 render path 多出一层与“真实动态 expression 数量”不成比例的重复工作

**修复动作**

- `frontend/src/runtime/simulatorRuntime.ts` 按对象类型缓存 dynamic expression 字段，避免 repeated render 中重复扫描同类 schema
- 仅对“非空且非纯数值”的 source 执行 expression 重算，跳过未启用 expression 的数值 fallback 路径
- 保留变量变化 / 时间变化时的运行态同步能力，不回退前一轮 correctness 修复
- 补充 runtime 回归测试，覆盖“schema lookup 缓存”与“数值 fallback 不重复回写”两条性能防回归路径

**验证证据**

- `npm run test:frontend -- simulator-runtime`：通过（14/14）

## 6. 新增发现与修复（G / F 交界）

### Finding 7 — P2：save / export / local load 与 import / embed 的对象上限校验边界不一致

**区域**

- G. 大场景运行稳定性与场景持久化边界区
- F. 场景 IO、导入导出、预设与嵌入区

**类型**

- 冲突：导入 / embed 链路会拒绝超大场景，但本地保存 / 导出 / 本地加载旧实现未执行同一条上限校验
- Bug：用户可以成功导出或写入一个之后又无法被统一链路接受的场景数据
- UI 不合理：同一份场景在“保存成功 / 导出成功”和“导入失败 / payload 被拒绝”之间来回打架，用户无法理解边界到底在哪

**根因链**

1. `js/utils/Serializer.js` 的 `validateSceneData()` 已限制 `objects.length <= 5000`
2. 但旧版 `saveSceneData()` 只做 `JSON.stringify()` + `localStorage.setItem()`，保存前不校验对象上限
3. `frontend/src/runtime/simulatorRuntime.ts` 的 `saveScene()` / `exportScene()` 旧实现也直接透传给 `Serializer`，`loadScene()` 则把本地数据直接 `scene.loadFromData()`
4. 结果是 import / embed 会拒绝的 payload，本地 save / export / local load 仍可能放行，形成跨区域语义冲突

**修复动作**

- `js/utils/Serializer.js`
  - `saveSceneData()` 在写入前先执行 `validateSceneData()`，超限场景直接拒绝，避免脏数据落盘
- `frontend/src/runtime/simulatorRuntime.ts`
  - 新增统一的场景持久化校验入口，复用于 `saveScene()` 与 `exportScene()`
  - `loadScene()` 改为复用 `loadSceneData()`，确保本地读取结果也走同一条 `validateSceneData()` 校验链
  - `saveScene()` / `loadScene()` / `exportScene()` 统一返回 `{ ok, error? }`，为上层保留结构化错误
- `frontend/src/stores/simulatorStore.ts`
  - 保存 / 加载 / 导出失败时直接显示底层详细错误，而不是继续写通用成功或失败文案

**验证证据**

- `npm test`：通过（134/134）
- `npm run test:frontend -- simulator-runtime simulator-store`：通过（44/44）
- `npm run test:frontend`：通过（203/203）
- `PLAYWRIGHT_VITE_PORT=4787 npx playwright test -c frontend/playwright.config.ts frontend/e2e/core-path.spec.ts --project=desktop-chromium`：通过（1/1）

## 8. 新增发现与修复（G 区）

### Finding 9 — P2：高频发射场景缺少动态粒子总量保护，粒子数与步耗时会持续线性增长

**区域**

- G. 大场景运行稳定性与场景持久化边界区
- F / G 交界：运行态对象增长与可保存上限一致性区

**类型**

- 冲突：`Serializer` / `sceneSchema` 已把可接受场景对象数限制在 `5000`，但运行时发射链旧实现没有对应的动态对象预算
- Bug：电子枪或可编程发射器在 `bounce` 等不会自动回收粒子的场景中，会持续把新粒子塞进 `scene.objects`
- UI 不合理：场景看起来还能继续运行，但粒子数、内存占用与单步耗时会持续上升，最终表现为明显卡顿；同时这类运行态场景又无法被稳定保存/导出

**根因链**

1. `js/objects/ElectronGun.js` 与 `js/objects/ProgrammableEmitter.js` 旧实现只有“单 tick 最大发射量”限制，没有“场景总粒子量”限制
2. 在 `boundaryMode = bounce` 或其它不会快速淘汰粒子的场景下，发射器每帧都会继续 `scene.addObject(particle)`
3. 复现实测中，`emissionRate = 20000` 的电子枪在约 `1.92s` 内就把粒子数推到 `38400`；步耗时从约 `4ms` 增长到 `28ms`
4. 由于 `Scene.serialize()` 会把运行中的粒子也写入 `objects`，这类场景又会和 `5000` 对象上限产生二次冲突

**修复动作**

- `js/core/Scene.js`
  - 新增 `canAcceptParticle()`，按当前非粒子对象数计算剩余动态粒子预算，确保运行态总对象数不继续突破 `5000` 上限
- `js/objects/ElectronGun.js` / `js/objects/ProgrammableEmitter.js`
  - 发射前先检查 `scene.canAcceptParticle()`；预算耗尽后直接丢弃额外发射，避免继续推高粒子数与步耗时
- `test/emitter_spawn_origin.test.js`
  - 补上两个回归测试，锁定“两个发射器在预算耗尽后都不能继续增加粒子数”

**验证证据**

- `node --test test/emitter_spawn_origin.test.js`：通过（4/4）
- 复现实测：高频电子枪在 `180` 步后稳定停在 `4999` 粒子 / `5000` 对象，单步耗时约 `1.9-2.4ms`
- `npm test`：通过（137/137）
- `npm run test:frontend`：通过（204/204）
- `PLAYWRIGHT_VITE_PORT=4787 npx playwright test -c frontend/playwright.config.ts frontend/e2e/core-path.spec.ts --project=desktop-chromium`：通过（1/1）

## 9. 新增发现与修复（G 区 observability）

### Finding 10 — P3：缺少高频发射 + 轨迹策略的 profiling 基线，内存 / GC / 步时抖动只能靠临时脚本排查

**区域**

- G. 大场景运行稳定性与场景持久化边界区

**类型**

- 冲突：项目已有 `test/perf_budget.test.js` 这种平均步时门禁，但缺少针对高频发射与轨迹策略差异的可重复观测工具
- Bug（工程能力层面）：出现峰值内存或步时抖动时，只能靠一次性脚本临时排查，难以形成稳定基线
- UI / DX 不合理：同类 G 区问题修掉后，后续回归无法快速回答“哪种轨迹策略更稳、峰值堆内存涨了多少、p95 步时有没有恶化”

**落地动作**

- `test/helpers/perfRunner.js`
  - 新增 `runProfileCase()` 与 `runHighEmissionRetentionProfiles()`，统一输出粒子峰值、轨迹点峰值、步时分位数与堆内存走势
- `test/high_emission_profile.test.js`
  - 新增结构化回归测试，锁定三种轨迹策略 profile 都遵守动态对象预算，且 `trajectories-off` 的轨迹点峰值为 `0`
- `scripts/profile-high-emission.mjs`
  - 新增可直接运行的 profiling 命令，输出 JSON 明细和控制台摘要表
- `package.json` / `TESTING-GUIDE.md`
  - 暴露 `npm run profile:high-emission` 命令，并记录可调参数与输出字段

**验证证据**

- `node --test test/high_emission_profile.test.js`：通过（1/1）
- `npm run profile:high-emission`：可输出三种轨迹策略的对比报表
- `npm test`：通过（138/138）
- `npm run test:frontend`：通过（204/204）
- `PLAYWRIGHT_VITE_PORT=4787 npx playwright test -c frontend/playwright.config.ts frontend/e2e/core-path.spec.ts --project=desktop-chromium`：通过（1/1）

## 7. 新增发现与修复（G 区）

### Finding 8 — P2：隐藏轨迹后仍在后台累积轨迹点，单粒子关闭轨迹也不会释放历史缓存

**区域**

- G. 大场景运行稳定性与场景持久化边界区
- D / G 交界：属性开关与运行时内存语义区

**类型**

- 冲突：Renderer 只有在 `scene.settings.showTrajectories && particle.showTrajectory` 时才绘制轨迹，但 Integrator 旧实现只检查 `particle.showTrajectory`，导致“全局已隐藏、后台仍记录”
- Bug：通过属性面板把粒子的 `显示轨迹` 关掉后，旧轨迹数组仍完整保留，不会释放已占用内存
- UI 不合理：用户看到轨迹已经隐藏，会自然认为轨迹相关开销已停止；旧实现却仍可能继续积累或保留大量历史点

**根因链**

1. `js/core/Renderer.js` 只在全局与粒子级开关同时开启时才绘制轨迹
2. 但 `js/physics/Integrator.js` 旧实现记录轨迹时只检查 `particle.showTrajectory`
3. 这使得 `scene.settings.showTrajectories = false` 时，界面不画轨迹，但粒子仍会持续 `addTrajectoryPoint()`
4. 另外 `frontend/src/runtime/simulatorRuntime.ts` 在属性提交时只是把 `showTrajectory` 改成 `false`，没有调用 `clearTrajectory()` 清空已有缓存

**修复动作**

- `js/physics/Integrator.js`
  - 记录轨迹前同时检查场景级 `showTrajectories`，避免全局隐藏时继续后台累积
- `frontend/src/runtime/simulatorRuntime.ts`
  - 当属性面板把粒子 `showTrajectory` 切为 `false` 时，立即调用 `clearTrajectory()` 释放历史轨迹缓存
- `test/particle_schema.test.js` / `frontend/test/simulator-runtime.test.ts`
  - 分别补上“全局隐藏不再追加轨迹点”和“单粒子关轨迹即清缓存”的回归测试

**验证证据**

- `node --test test/particle_schema.test.js`：通过（2/2）
- `npm run test:frontend -- simulator-runtime`：通过（18/18）
- `npm test`：通过（135/135）
- `npm run test:frontend`：通过（204/204）
- `PLAYWRIGHT_VITE_PORT=4787 npx playwright test -c frontend/playwright.config.ts frontend/e2e/core-path.spec.ts --project=desktop-chromium`：通过（1/1）

## 9. 新增发现与修复（G 区 observability）

### Finding 10 — P3：缺少高频发射 + 轨迹策略的 profiling 基线，内存 / GC / 步时抖动只能靠临时脚本排查

**区域**

- G. 大场景运行稳定性与场景持久化边界区

**类型**

- 冲突：项目已有 `test/perf_budget.test.js` 这种平均步时门禁，但缺少针对高频发射与轨迹策略差异的可重复观测工具
- Bug（工程能力层面）：出现峰值内存或步时抖动时，只能靠一次性脚本临时排查，难以形成稳定基线
- UI / DX 不合理：同类 G 区问题修掉后，后续回归无法快速回答“哪种轨迹策略更稳、峰值堆内存涨了多少、p95 步时有没有恶化”

**落地动作**

- `test/helpers/perfRunner.js`
  - 新增 `runProfileCase()` 与 `runHighEmissionRetentionProfiles()`，统一输出粒子峰值、轨迹点峰值、步时分位数与堆内存走势
- `test/high_emission_profile.test.js`
  - 新增结构化回归测试，锁定三种轨迹策略 profile 都遵守动态对象预算，且 `trajectories-off` 的轨迹点峰值为 `0`
- `scripts/profile-high-emission.mjs`
  - 新增可直接运行的 profiling 命令，输出 JSON 明细和控制台摘要表
- `package.json` / `TESTING-GUIDE.md`
  - 暴露 `npm run profile:high-emission` 命令，并记录可调参数与输出字段

**验证证据**

- `node --test test/high_emission_profile.test.js`：通过（1/1）
- `npm run profile:high-emission`：可输出三种轨迹策略的对比报表
- `npm test`：通过（138/138）
- `npm run test:frontend`：通过（204/204）
- `PLAYWRIGHT_VITE_PORT=4787 npx playwright test -c frontend/playwright.config.ts frontend/e2e/core-path.spec.ts --project=desktop-chromium`：通过（1/1）

## 8. 新增发现与修复（G 区）

### Finding 9 — P2：高频发射场景缺少动态粒子总量保护，粒子数与步耗时会持续线性增长

**区域**

- G. 大场景运行稳定性与场景持久化边界区
- F / G 交界：运行态对象增长与可保存上限一致性区

**类型**

- 冲突：`Serializer` / `sceneSchema` 已把可接受场景对象数限制在 `5000`，但运行时发射链旧实现没有对应的动态对象预算
- Bug：电子枪或可编程发射器在 `bounce` 等不会自动回收粒子的场景中，会持续把新粒子塞进 `scene.objects`
- UI 不合理：场景看起来还能继续运行，但粒子数、内存占用与单步耗时会持续上升，最终表现为明显卡顿；同时这类运行态场景又无法被稳定保存/导出

**根因链**

1. `js/objects/ElectronGun.js` 与 `js/objects/ProgrammableEmitter.js` 旧实现只有“单 tick 最大发射量”限制，没有“场景总粒子量”限制
2. 在 `boundaryMode = bounce` 或其它不会快速淘汰粒子的场景下，发射器每帧都会继续 `scene.addObject(particle)`
3. 复现实测中，`emissionRate = 20000` 的电子枪在约 `1.92s` 内就把粒子数推到 `38400`；步耗时从约 `4ms` 增长到 `28ms`
4. 由于 `Scene.serialize()` 会把运行中的粒子也写入 `objects`，这类场景又会和 `5000` 对象上限产生二次冲突

**修复动作**

- `js/core/Scene.js`
  - 新增 `canAcceptParticle()`，按当前非粒子对象数计算剩余动态粒子预算，确保运行态总对象数不继续突破 `5000` 上限
- `js/objects/ElectronGun.js` / `js/objects/ProgrammableEmitter.js`
  - 发射前先检查 `scene.canAcceptParticle()`；预算耗尽后直接丢弃额外发射，避免继续推高粒子数与步耗时
- `test/emitter_spawn_origin.test.js`
  - 补上两个回归测试，锁定“两个发射器在预算耗尽后都不能继续增加粒子数”

**验证证据**

- `node --test test/emitter_spawn_origin.test.js`：通过（4/4）
- 复现实测：高频电子枪在 `180` 步后稳定停在 `4999` 粒子 / `5000` 对象，单步耗时约 `1.9-2.4ms`
- `npm test`：通过（137/137）
- `npm run test:frontend`：通过（204/204）
- `PLAYWRIGHT_VITE_PORT=4787 npx playwright test -c frontend/playwright.config.ts frontend/e2e/core-path.spec.ts --project=desktop-chromium`：通过（1/1）

## 9. 新增发现与修复（G 区 observability）

### Finding 10 — P3：缺少高频发射 + 轨迹策略的 profiling 基线，内存 / GC / 步时抖动只能靠临时脚本排查

**区域**

- G. 大场景运行稳定性与场景持久化边界区

**类型**

- 冲突：项目已有 `test/perf_budget.test.js` 这种平均步时门禁，但缺少针对高频发射与轨迹策略差异的可重复观测工具
- Bug（工程能力层面）：出现峰值内存或步时抖动时，只能靠一次性脚本临时排查，难以形成稳定基线
- UI / DX 不合理：同类 G 区问题修掉后，后续回归无法快速回答“哪种轨迹策略更稳、峰值堆内存涨了多少、p95 步时有没有恶化”

**落地动作**

- `test/helpers/perfRunner.js`
  - 新增 `runProfileCase()` 与 `runHighEmissionRetentionProfiles()`，统一输出粒子峰值、轨迹点峰值、步时分位数与堆内存走势
- `test/high_emission_profile.test.js`
  - 新增结构化回归测试，锁定三种轨迹策略 profile 都遵守动态对象预算，且 `trajectories-off` 的轨迹点峰值为 `0`
- `scripts/profile-high-emission.mjs`
  - 新增可直接运行的 profiling 命令，输出 JSON 明细和控制台摘要表
- `package.json` / `TESTING-GUIDE.md`
  - 暴露 `npm run profile:high-emission` 命令，并记录可调参数与输出字段

**验证证据**

- `node --test test/high_emission_profile.test.js`：通过（1/1）
- `npm run profile:high-emission`：可输出三种轨迹策略的对比报表
- `npm test`：通过（138/138）
- `npm run test:frontend`：通过（204/204）
- `PLAYWRIGHT_VITE_PORT=4787 npx playwright test -c frontend/playwright.config.ts frontend/e2e/core-path.spec.ts --project=desktop-chromium`：通过（1/1）

## 10. 新增发现与修复（D / G 交界 observability）

### Finding 11 — P3：缺少大量 expression 绑定对象并发时的 profiling 基线，刷新负载变化难以追踪

**区域**

- D / G 交界：expression 绑定运行时同步链

**类型**

- 冲突：项目已修掉 expression correctness 与 render-path 缓存问题，但仍缺少专门观察并发 expression 绑定负载的基线命令
- Bug（工程能力层面）：当后续改动影响 `refreshDynamicExpressionBindings()` 时，现有测试只能证明“逻辑对不对”，不能快速回答“parse 次数、refresh p95、总步时和堆内存是否恶化”
- UI / DX 不合理：用户层面感知是“变量一多就卡”，但工程侧没有现成工具区分是静态 fallback、变量绑定还是时间绑定场景退化

**落地动作**

- `test/helpers/perfRunner.js`
  - 新增 `runExpressionBindingProfiles()`，模拟大量粒子在 `static / variable / time` 三种 expression 场景下的刷新开销
  - 输出 `peakParseCalls`、`peakActiveParticles`、`avg/p95 refreshMs`、`avg/p95 totalStepMs` 与堆内存走势
- `test/expression_binding_profile.test.js`
  - 新增结构化测试，锁定静态 fallback 场景 `peakParseCalls = 0`，变量/时间绑定场景各自维持 `2 * particleCount` 的解析负载
- `scripts/profile-expressions.mjs`
  - 新增可直接运行的 profiling 命令，输出 JSON 明细和摘要表
- `package.json` / `TESTING-GUIDE.md`
  - 暴露 `npm run profile:expressions` 命令与可调参数

**验证证据**

- `node --test test/expression_binding_profile.test.js`：通过（1/1）
- `npm run profile:expressions`：可输出三种 expression 场景的对比报表
- `npm test`：通过（139/139）
- `npm run test:frontend`：通过（204/204）
- `PLAYWRIGHT_VITE_PORT=4787 npx playwright test -c frontend/playwright.config.ts frontend/e2e/core-path.spec.ts --project=desktop-chromium`：通过（1/1）

## 11. 新增发现与修复（D / G 交界 browser render observability）

### Finding 12 — P3：缺少真实浏览器渲染线程中的 FPS / long-task 基线，主线程卡顿无法和模拟侧退化分离

**区域**

- D / G 交界：运行时模拟与浏览器渲染线程观测链

**类型**

- 冲突：项目已经补上 Node 侧高发射 / expression profiling，但这些基线无法回答“真实浏览器掉帧是否来自主线程渲染压力”
- Bug（工程能力层面）：一旦出现拖慢、掉帧或长任务，只能手动开 DevTools 临时看图，缺少可重复、可脚本化的观测入口
- UI / DX 不合理：用户感知是“页面卡顿”，但工程侧现有命令只能看到物理更新耗时，看不到 `requestAnimationFrame` 与 `longtask` 的真实表现

**落地动作**

- `frontend/src/embed/profileHarness.ts`
  - 新增最小 profile 调试句柄 `window.__ELECTRIC_FIELD_PROFILE__`，只暴露 `loadSceneData()`、`startRunning()`、`stopRunning()`、`getSnapshot()`
- `frontend/src/main.ts`
  - 仅在开发浏览器环境中安装该 profile harness，与正式 host 协议解耦
- `frontend/test/profile-harness.test.ts`
  - 新增边界测试，锁定句柄暴露面、快照字段与 legacy boolean load 结果归一化
- `scripts/lib/browserRenderProfile.mjs` / `test/browser_render_profile.test.js`
  - 提炼场景构造与结果汇总纯函数，锁定 `avgFps`、`p95FrameMs`、`longTaskCount`、`peakParticles`、`finalSnapshot` 等字段
- `scripts/profile-browser-render.mjs` / `package.json` / `TESTING-GUIDE.md`
  - 新增 `npm run profile:browser-render`，自动拉起独立前端服务并在 Chromium 中采集 `rAF` 帧间隔、`PerformanceObserver(longtask)` 与运行态快照

**验证证据**

- `npm run test:frontend -- profile-harness`：通过（2/2）
- `node --test test/browser_render_profile.test.js`：通过（2/2）
- `npm run profile:browser-render`：可输出 `high-emission-trajectories-off` / `high-emission-trajectories-on` 两组浏览器基线摘要

## 12. 新增发现与修复（D / G 交界 expression UI browser observability）

### Finding 13 — P3：缺少属性抽屉 / 变量表 / expression hint 联动场景的浏览器主线程基线，UI 卡顿无法与纯模拟退化区分

**区域**

- D / G 交界：expression 绑定运行时同步链与 Vue authoring UI 联动

**类型**

- 冲突：项目已经有 Node 侧 expression profiling 和浏览器 render profiling，但都没有覆盖“打开属性抽屉 + 应用变量 + 恢复抽屉 + 更新 hint”这条真实 UI 链路
- Bug（工程能力层面）：当后续改动让变量表应用、抽屉恢复或 expression hint 更新变慢时，现有命令无法回答是运行时刷新变慢，还是 authoring UI 本身带来了额外主线程压力
- UI / DX 不合理：用户感知是“改变量后抽屉卡一下”或“时间推进时预览不丝滑”，但工程侧之前没有现成基线去复现和量化这类卡顿

**落地动作**

- `frontend/src/runtime/simulatorRuntime.ts` / `frontend/src/stores/simulatorStore.ts`
  - 新增最小选中入口 `selectObjectByIndex()`，供开发态 profiling 稳定选中对象
- `frontend/src/embed/profileHarness.ts` / `frontend/src/embed/profileHarnessStore.ts` / `frontend/src/main.ts`
  - 扩展开发态 profile harness，新增 `selectObjectByIndex()`、`openPropertyPanel()`、`openVariablesPanel()`，并用实时 getter 映射 store 状态，避免快照指标被静态捕获
- `frontend/test/profile-harness.test.ts`
  - 新增测试，锁定 harness 暴露面与“live store -> snapshot”映射语义
- `scripts/lib/browserExpressionUiProfile.mjs` / `test/browser_expression_ui_profile.test.js`
  - 新增场景构造与汇总 helper，输出 `hintChangeCount`、`finalHintText`、`successfulIterations` 等 UI 联动指标
- `scripts/profile-browser-expressions.mjs` / `package.json` / `TESTING-GUIDE.md`
  - 新增 `npm run profile:browser-expressions`，在 Chromium 中采集变量表恢复到属性抽屉、时间推进驱动 hint 变化两类场景的基线

**验证证据**

- `npm run test:frontend -- profile-harness`：通过（3/3）
- `node --test test/browser_expression_ui_profile.test.js`：通过（2/2）
- `npm run profile:browser-expressions`：可输出 `expression-variable-drawer-restore` / `expression-time-drawer-live` 两组浏览器基线摘要

## 13. 新增发现与修复（D / F authoring scene-switch state sync）

### Finding 14 — P3：场景切换后变量表草稿仍停留在旧场景，导致 authoring 上下文与当前 scene 脱节

**区域**

- D. 属性编辑、变量与 authoring 状态协同区
- F. 场景 IO、预设与本地加载区

**类型**

- 冲突：runtime 已切到新场景变量，但变量表仍保留旧 `variableDraft`
- Bug：`loadSceneData()`、`loadScene()`、`importScene()`、`loadPreset()` 成功后没有刷新 authoring 变量草稿
- UI 不合理：变量表会继续展示旧场景上下文，用户可能误以为新场景变量未生效，或把旧变量再次写回新场景

**根因链**

1. `frontend/src/stores/simulatorStore.ts` 中的 `variableDraft` 是独立于 runtime 的 authoring 草稿
2. 这种分离在“编辑未提交草稿”时是合理的，但旧实现没有在“成功切换到另一份 scene”后做一次上下文重置
3. 结果是变量表打开或曾编辑过旧变量后，再加载本地场景、导入文件或切换预设时，草稿仍停留在旧值
4. 后续再次点击“应用变量”时，旧场景变量还可能反向污染当前 scene

**落地动作**

- `frontend/src/stores/simulatorStore.ts`
  - 新增 `syncVariableDraftFromScene()`，统一从当前 `runtime.scene.variables` 归一化刷新 `variableDraft`
  - 仅在场景真正替换成功后调用，避免普通渲染 / snapshot 时覆盖用户未提交草稿
- 成功路径补齐同步：
  - `loadSceneData()`
  - `loadScene()`
  - `importScene()`
  - `loadPreset()`
- `frontend/test/simulator-store.test.ts`
  - 新增回归测试，锁定“切场景后变量草稿同步，但不强制关闭变量表”的行为
  - 覆盖本地场景加载与预设切换两条路径

**验证证据**

- `npm run test:frontend -- simulator-store`：通过（30/30）
- `npm run test:frontend`：通过（210/210）
- `npm run typecheck:frontend`：通过
- `npm run lint:frontend`：通过
- `git diff --check`：通过

## 14. 新增发现与修复（A / D authoring drawer restore chain）

### Finding 15 — P2：属性抽屉覆盖 markdown / variables 后关闭时不会恢复上一层，authoring 上下文被静默打断

**区域**

- A. 应用壳层与导航编排区
- D. 属性编辑、变量与 Markdown 协同区

**类型**

- 冲突：`drawerHistory` 已支持多抽屉链式恢复，但 `property` 被单独排除在恢复链之外
- Bug：`markdown -> property -> close`、`variables -> property -> close` 等链路会直接丢失上一层抽屉上下文
- UI 不合理：用户只是临时打开属性抽屉查看/编辑对象，关闭后却被迫重新打开原来的 markdown / variables 面板

**根因链**

1. `frontend/src/stores/simulatorStore.ts` 已有 `drawerHistory` 和 `restorePreviousDrawer()`，用于在多抽屉之间恢复上一层上下文
2. 但旧实现的 `closeDrawer()` 对 `property` 存在特判：关闭后直接 `return`，不会尝试恢复历史抽屉
3. 结果是当属性抽屉只是覆盖态而非根抽屉时，关闭属性抽屉会把 `activeDrawer` 直接置空
4. 同样的问题也会影响删除当前对象等“由属性抽屉触发并顺带关闭抽屉”的路径

**落地动作**

- `frontend/src/stores/simulatorStore.ts`
  - 去掉 `closeDrawer('property')` 的提前返回，让属性抽屉关闭后也能走统一的 `restorePreviousDrawer()` 逻辑
  - 保留“没有历史抽屉时直接关闭”的现有行为
- `frontend/test/simulator-store.test.ts`
  - 新增回归测试，锁定“markdown 上打开 property，关闭后应恢复 markdown”
  - 新增回归测试，锁定“删除当前对象导致 property 关闭后，也应恢复 markdown”

**验证证据**

- `npm run test:frontend -- simulator-store`：通过（32/32）
- `npm run test:frontend`：通过（212/212）
- `npm run typecheck:frontend`：通过
- `npm run lint:frontend`：通过
- `git diff --check`：通过

## 15. 新增发现与修复（A / D phone sheet drawer return chain）

### Finding 16 — P2：手机端从 `selected / more` Sheet 进入抽屉后，关闭抽屉不会回到来源 Sheet，导致操作链被打断

**区域**

- A. 应用壳层与手机导航编排区
- D. 属性、变量与题板协同区

**类型**

- 冲突：手机底部 Sheet 与 authoring 抽屉都是“二级工作区”，但旧实现把“打开抽屉”错误地当成“离开来源 Sheet”
- Bug：从 `selected` Sheet 打开属性抽屉、从 `more` Sheet 打开变量表后，关闭抽屉不会恢复来源 Sheet
- UI 不合理：用户完成一次深层编辑后会被打回空状态，只能重新点底部导航找回刚才的工作上下文

**根因链**

1. `frontend/src/modes/useAppActions.ts` 旧实现中，`openSelectedPropertiesFromPhoneSheet()`、`openVariablesPanelFromPhoneMore()`、`toggleMarkdownBoardFromPhoneMore()` 打开抽屉时都会立即 `closePhoneSheets()`
2. 这会把 `phoneActiveSheet` 直接清空，导致来源 Sheet 状态丢失
3. 同时 `frontend/src/modes/usePhoneSheets.ts` 旧实现没有“抽屉打开时挂起 Sheet 渲染”的概念，只能靠硬关闭 Sheet 来避免叠层冲突
4. 结果是用户关闭抽屉后，UI 无法知道先前来自哪个手机 Sheet，自然也就无法恢复

**落地动作**

- `frontend/src/modes/usePhoneSheets.ts`
  - 新增“抽屉打开时挂起 Sheet 渲染”的计算逻辑：保留 `phoneActiveSheet`，但在 `activeDrawer !== null` 时临时隐藏 Sheet
  - 让来源 Sheet 状态在抽屉期间持续保留，抽屉关闭后自然恢复
- `frontend/src/modes/useAppActions.ts`
  - 打开属性抽屉 / 变量表 / 题板时不再强制 `closePhoneSheets()`
  - 保持“来源 Sheet 状态保留，渲染临时挂起”的一致语义
- `frontend/test/app-shell.test.ts` / `frontend/test/use-app-actions.test.ts`
  - 新增回归测试，锁定 `selected -> property -> close -> selected`
  - 新增回归测试，锁定 `more -> variables -> close -> more`

**验证证据**

- `npm run test:frontend -- app-shell use-app-actions use-phone-sheets`：通过（55/55）
- `npm run test:frontend`：通过（219/219）
- `npm run typecheck:frontend`：通过
- `npm run lint:frontend`：通过
- `git diff --check`：通过

## 16. 新增发现与修复（B zone context-menu dismiss chain）

### Finding 17 — P2：桌面右键菜单在空白右键或后续直接操作开始时不会及时收起，旧菜单会残留干扰画布反馈

**区域**

- B. 画布视口与直接操作区

**类型**

- 冲突：右键菜单属于短时上下文反馈，但旧实现没有和新的 pointer 交互建立统一收口关系
- Bug：菜单打开后，在空白处再次右键或开始新的直接操作时，旧菜单仍可能停留在画布上
- UI 不合理：用户已经切到新的交互上下文，界面却还展示上一次对象的菜单，容易误导为“当前仍选中旧对象 / 当前操作仍指向旧位置”

**根因链**

1. `js/interactions/DragDropManager.js` 旧实现只有“右键命中对象时显示菜单”的逻辑，没有统一的 `hideContextMenu()` 收口 helper
2. `onContextMenu()` 在空白区域上只是什么都不做，因此旧菜单会保留在屏幕上
3. `onPointerDown()` 开始新的拖拽/平移/选择时也不会主动收起旧菜单
4. 结果是菜单 DOM 生命周期与画布直接操作链脱节，形成 stale menu 残留

**落地动作**

- `js/interactions/DragDropManager.js`
  - 新增 `hideContextMenu()` helper，统一隐藏菜单 DOM，并清理延迟关闭 timer / document click handler
  - `onPointerDown()` 开头先收起旧菜单，再进入新的直接操作链
  - `onContextMenu()` 先统一收口；若命中空白区域则只关闭旧菜单、不再重开
- `test/dragdrop_manager_dom.test.js`
  - 新增回归测试，锁定“空白右键应收起旧菜单”
  - 新增回归测试，锁定“新的 pointerdown 开始前应先收起旧菜单”

**验证证据**

- `node --test test/dragdrop_manager_dom.test.js`：通过（16/16）
- `npm test`：通过（145/145）
- `npm run test:frontend`：通过（219/219）
- `npm run typecheck:frontend`：通过
- `npm run lint:frontend`：通过
- `git diff --check`：通过

## 17. 新增发现与修复（B zone pen/stylus gesture classification）

### Finding 18 — P2：手写笔 `pen` 指针被误判成 touch，导致 stylus 会误触发长按/双击开属性等手势

**区域**

- B. 画布视口与直接操作区

**类型**

- 冲突：手写笔属于精确指针，但旧实现把所有“非 mouse”都当作 touch 处理
- Bug：`pointerType === 'pen'` 时会错误进入 touch long-press / double-tap / touch-threshold 分支
- UI 不合理：2-in-1 / 平板 + stylus 用户本想做精确点选或拖拽，却可能被误判成“长按开属性”或“双击开属性”

**根因链**

1. `js/interactions/DragDropManager.js` 中 `isTouchPointerEvent()` 旧实现直接使用 `pointerType !== 'mouse'`
2. 这导致 `pen` 被当成 touch 录入 `touchPoints`，并复用 touch 的 8px 拖拽阈值
3. 同时长按属性面板与双击开属性的 tap-chain 逻辑也用“非 mouse”判定，进一步把 stylus 误纳入 touch 手势
4. 结果是 stylus 的精确输入语义与手指手势语义冲突，直接操作链变得不稳定

**落地动作**

- `js/interactions/DragDropManager.js`
  - 将 `isTouchPointerEvent()` 收紧为仅 `pointerType === 'touch'`
  - 长按开属性改为 touch-only
  - 双击开属性 tap-chain 改为 touch-only
  - 拖拽阈值改为“touch 用 touch 阈值，pen / mouse 走精确指针阈值”
- `test/dragdrop_manager_dom.test.js`
  - 新增回归测试，锁定“pen 双击不应触发属性面板”
  - 新增回归测试，锁定“pen pointerdown 不应启动 touch long-press timer”

**验证证据**

- `node --test test/dragdrop_manager_dom.test.js`：通过（18/18）
- `npm test`：通过（147/147）
- `npm run test:frontend`：通过（219/219）
- `npm run typecheck:frontend`：通过
- `npm run lint:frontend`：通过
- `git diff --check`：通过

## 18. 新增发现与修复（E zone demo-context restore chain）

### Finding 19 — P2：demo mode 进出会丢失选中态与编辑上下文，用户返回编辑态后被打回空状态

**区域**

- E. 运行控制与模式切换区
- A. 手机导航编排区
- D. 属性编辑与 authoring 上下文协同区

**类型**

- 冲突：demo mode 只恢复场景对象，不恢复正在进行的选中 / 编辑上下文
- Bug：退出 demo 后 `selectedObjectId` 丢失，属性抽屉和手机 `selected` sheet 都不会回到原链路
- UI 不合理：用户只是临时进入演示态查看效果，返回时却需要重新选对象、重新打开面板，编辑流被硬中断

**根因链**

1. `frontend/src/runtime/simulatorRuntime.ts` 的 `demoSession` 旧实现只保存 `snapshot + wasRunning`，没有保留 `selectedObjectId`
2. `exitDemoMode()` 虽然会 `loadFromData(session.snapshot)` 恢复对象，但恢复后不会再按 id 把 `scene.selectedObject` 指回原对象
3. `frontend/src/stores/simulatorStore.ts` 在 demo 进出时会收到 `onPropertyHide()`，属性抽屉被关闭后没有待恢复路径
4. `frontend/src/modes/usePhoneSheets.ts` 在 selection 清空时会关闭手机 `selected` sheet，但旧实现也没有“demo 临时清空 -> 恢复后重开”的记忆
5. 结果是 demo mode 退出后虽然对象回来了，但用户上下文没有回来，形成“场景恢复了，编辑流没恢复”的模式切换断裂

**落地动作**

- `frontend/src/runtime/simulatorRuntime.ts`
  - `demoSession` 新增保存 `selectedObjectId`
  - 退出 demo 后在恢复 snapshot 之后按 id 恢复 `scene.selectedObject`
- `frontend/src/stores/simulatorStore.ts`
  - `toggleDemoMode()` 进入 demo 前记住“属性抽屉是否打开且存在选中对象”
  - 退出 demo 且选中态恢复后，自动重开属性抽屉，回到原编辑上下文
- `frontend/src/modes/usePhoneSheets.ts`
  - 新增“demo 临时清空 selected sheet”的待恢复标记
  - 当选中对象在退出 demo 后重新出现时，自动恢复手机 `selected` sheet
- `frontend/test/simulator-store.test.ts` / `frontend/test/use-phone-sheets.test.ts` / `frontend/test/app-shell.test.ts`
  - 新增回归测试，锁定 demo 退出后选中态、属性抽屉和手机 selected sheet 的恢复链
  - 新增 phone more -> markdown -> close -> more 的补充回归，避免真实浏览器流与单测假设再次漂移
- `frontend/e2e/touch-core-path.spec.ts`
  - 将“更多 -> 题板 -> 关闭 -> 变量表”路径改成符合当前恢复语义的浏览器断言

**验证证据**

- `npm run test:frontend -- app-shell simulator-store use-phone-sheets`：通过（77/77）
- `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- --grep "phone markdown and variables panels keep touch targets at least 44px|core path create/edit/play/io/demo"`：通过（2 passed, 1 skipped）

## 19. A-H 覆盖矩阵与补审结论

### A. 应用壳层与导航编排区

- 已审计并形成明确 findings：Round 1 Finding 2/3/4，Round 2 Finding 15/16/19
- 本轮补证：`frontend/test/app-shell.test.ts`、`frontend/test/use-phone-sheets.test.ts`、手机 Playwright 关键流
- 结论：来源 sheet / drawer 恢复链、demo 退出上下文恢复链已补齐，未发现新的未闭环区域

### B. 画布视口与直接操作区

- 已审计并形成明确 findings：Round 2 Finding 17/18
- 本轮补证：`test/dragdrop_manager_dom.test.js`、桌面右键菜单与 pen/stylus 手势回归
- 结论：context-menu 收口与 pointer 分类边界已闭环，暂无新增明确问题

### C. 对象创建、工具栏与预设区

- 已审计并形成明确 findings：Round 1 Finding 2/5
- 本轮补审：复核 `DesktopToolbarSidebar` / `ToolbarPanel` / `PhoneAddSheet` / `simulatorStore.loadPreset()` 与相关 Vitest、Playwright `core path`
- 重点核对：创建后选中态、手机 add -> selected 主链路、预设载入后的对象数/状态同步、桌面语义提示
- 结论：未发现新的明确冲突或 bug；C 区已补审完成，不存在未审计子区域

### D. 属性编辑、变量与 authoring 协同区

- 已审计并形成明确 findings：Round 2 Finding 1/2/3/4/5/6/14/15/16/19
- 本轮补证：属性抽屉、变量表、题板、demo 上下文恢复回归测试与浏览器流
- 结论：authoring 上下文恢复链已贯通，暂无新的未审计空白

### E. 运行控制与模式切换区

- 已审计并形成明确 findings：Round 1 Finding 3/4，Round 2 Finding 19
- 本轮补审：复核 `toggleDemoMode`、播放/暂停、重置/清空确认、demo 退出后的选中态与面板恢复
- 结论：新增 demo-context restore 问题已修复，E 区已完成补审

### F. 场景 IO、导入导出、预设与嵌入区

- 已审计并形成明确 findings：Round 1 Finding 1，Round 2 Finding 1/7/14
- 本轮补证：scene validation feedback、save/export/import/load/embed 边界统一回归
- 结论：F 区边界清晰，暂无剩余未审计项

### G. 引擎、物理正确性与性能稳定性区

- 已审计并形成明确 findings：Round 2 Finding 5/6/7/8/9/10/11/12/13
- 本轮补证：runtime / browser profiling 脚本、粒子预算、轨迹缓存释放、expression 刷新缓存回归
- 结论：G 区已完成审计与基线建设，无未审计区域

### H. 视觉样式、主题与可访问性区

- 已审计并形成明确 findings：Round 1 Finding 3/4/5
- 本轮补审：复核 `responsive-visual`、`touch-core-path`、`HeaderStatusAndSettings`、`PhoneMoreSheet`、Markdown / Variables 触达尺寸与恢复路径
- 重点核对：手机触控目标 >= 44px、危险操作分区、状态说明、题板/变量表关闭后的来源返回链
- 结论：未发现新的明确视觉 / 可访问性缺陷；H 区已补审完成

## 20. 结论

截至 2026-03-08，本轮已关闭十九个明确问题，且 A-H 全区域已完成补审，不存在未审计区域：

1. **P3：场景 IO / embed 错误反馈被通用文案吞掉** —— 已修复
2. **P3：多个显示尺寸字段同次提交会静默冲突** —— 已修复
3. **P3：属性抽屉 expression 缺少变量感知预览与错误反馈** —— 已修复
4. **P2：属性抽屉切换变量表 / 题板后无法回到原上下文，且会覆盖未提交草稿** —— 已修复
5. **P2：变量表 / 时间推进后 expression 预览与实际对象状态不一致** —— 已修复
6. **P3：dynamic expression 刷新在 repeated render 中重复扫 schema / 回写数值 fallback** —— 已修复
7. **P2：save / export / local load 与 import / embed 的对象上限校验边界不一致** —— 已修复
8. **P2：隐藏轨迹后仍在后台累积轨迹点，单粒子关闭轨迹也不会释放历史缓存** —— 已修复
9. **P2：高频发射场景缺少动态粒子总量保护，粒子数与步耗时会持续线性增长** —— 已修复
10. **P3：缺少高频发射 + 轨迹策略的 profiling 基线** —— 已修复
11. **P3：缺少大量 expression 绑定对象并发时的 profiling 基线** —— 已修复
12. **P3：缺少真实浏览器渲染线程中的 FPS / long-task 基线** —— 已修复
13. **P3：缺少属性抽屉 / 变量表 / expression hint 联动场景的浏览器主线程基线** —— 已修复
14. **P3：场景切换后变量表草稿停留在旧场景，authoring 上下文与当前 scene 脱节** —— 已修复
15. **P2：属性抽屉覆盖 markdown / variables 后关闭时不会恢复上一层，authoring 上下文被静默打断** —— 已修复
16. **P2：手机端从 selected / more Sheet 进入抽屉后，关闭不会回到来源 Sheet，操作链被打断** —— 已修复
17. **P2：桌面右键菜单在空白右键或后续直接操作开始时不会及时收起，旧菜单残留干扰画布反馈** —— 已修复
18. **P2：手写笔 pen 指针被误判成 touch，stylus 会误触发长按/双击开属性等手势** —— 已修复
19. **P2：demo mode 进出会丢失选中态与编辑上下文，退出后被打回空状态** —— 已修复
