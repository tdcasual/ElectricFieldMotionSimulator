# 测试指南（Vue3 主线）

## 环境要求

- Node.js 20+
- npm 10+

## 一键质量门禁

```bash
npm run quality:all
```

如本机默认 E2E 端口已被占用，可直接给整套门禁透传独立端口：

```bash
PLAYWRIGHT_VITE_PORT=4499 npm run quality:all
```

该命令会串行执行：

- `npm run lint:frontend`
- `npm run typecheck:frontend`
- `npm test`
- `npm run test:frontend`
- `npm run test:e2e`

## 分层测试说明

### 1) 引擎与核心逻辑（Node 测试）

```bash
npm test
```

覆盖物理引擎、对象注册、序列化、相切提示、主入口切换等核心逻辑。

### 2) Vue 组件与状态层（Vitest）

```bash
npm run test:frontend
```

覆盖 `App` 壳层、工具栏、属性抽屉、运行时桥接、`simulatorStore` 等 Vue 主链路。

补充说明（Week2 契约治理）：

- `frontend/test/scene-validation-contract.test.ts`：统一锁定 `sceneIO -> sceneSourceResolver -> hostBridge -> bootstrap` 的 `validation` code 与错误细节透传。
- `frontend/test/scene-source-resolver.test.ts`：覆盖 `sceneData` / `sceneUrl` / `materialId` 三种 embed 来源。
- `frontend/test/host-bridge.test.ts` 与 `frontend/test/embed-bootstrap.test.ts`：确保 host `loadScene` 与 embed 启动失败时不把细节吞成通用失败文案。

如只回归 IO / embed 契约，可执行：

```bash
npm run test:frontend -- scene-validation-contract scene-source-resolver host-bridge embed-bootstrap
```

### 2.5) G 区高发射 profiling 基线

```bash
npm run profile:high-emission
```

用于对比高频发射场景下三种轨迹策略的观测基线：

- `trajectories-off`：全局关闭轨迹显示
- `trajectories-seconds-2`：保留最近 2 秒轨迹
- `trajectories-infinite`：无限轨迹（受运行态对象预算保护）

输出包含：

- `peakParticles` / `peakObjects`
- `peakTrajectoryPoints`
- `avgStepMs` / `p95StepMs` / `maxStepMs`
- `heapUsedStartMB` / `heapUsedPeakMB` / `heapUsedEndMB`

可选环境变量：

```bash
PROFILE_STEPS=240 PROFILE_SAMPLE_EVERY=20 npm run profile:high-emission
```

### 2.6) D / G 交界 expression profiling 基线

```bash
npm run profile:expressions
```

用于对比大量粒子在三种 expression 绑定策略下的刷新负载：

- `expression-static-fallback`：纯数值 fallback，不触发表达式解析
- `expression-variable-bound`：依赖 `scene.variables`
- `expression-time-bound`：依赖 `scene.time`

输出包含：

- `peakParseCalls` / `peakActiveParticles`
- `avgRefreshMs` / `p95RefreshMs`
- `avgTotalStepMs` / `p95TotalStepMs`
- `heapUsedStartMB` / `heapUsedPeakMB` / `heapUsedEndMB`

可选环境变量：

```bash
PROFILE_PARTICLES=3200 PROFILE_STEPS=90 npm run profile:expressions
```

### 2.7) 真实浏览器 render profiling 基线

```bash
npm run profile:browser-render
```

用于对比高频发射场景在真实 Chromium 渲染线程中的观测基线：

- `high-emission-trajectories-off`：全局关闭轨迹显示
- `high-emission-trajectories-on`：全局开启轨迹显示

输出包含：

- `avgFps` / `p95FrameMs` / `maxFrameMs`
- `longTaskCount` / `longTaskTotalMs` / `longTaskMaxMs`
- `peakParticles` / `peakObjects`
- `finalSnapshot` / `snapshots`

可选环境变量：

```bash
PROFILE_BROWSER_PORT=4799 PROFILE_DURATION_MS=3000 PROFILE_SAMPLE_EVERY_MS=200 npm run profile:browser-render
```

说明：命令会自行启动一个独立的前端 dev server，并使用 Chromium 采样页面内 `requestAnimationFrame` 与 `PerformanceObserver(longtask)` 指标。

### 2.8) expression UI 浏览器主线程 profiling 基线

```bash
npm run profile:browser-expressions
```

用于对比 expression 绑定与属性抽屉联动场景在真实 Chromium 主线程中的基线：

- `expression-variable-drawer-restore`：变量表应用后恢复到属性抽屉，并观察 expression hint 更新
- `expression-time-drawer-live`：属性抽屉保持打开，运行时间推进并观察 expression hint 实时更新

输出包含：

- `avgFps` / `p95FrameMs` / `maxFrameMs`
- `longTaskCount` / `longTaskTotalMs` / `longTaskMaxMs`
- `hintChangeCount` / `finalHintText`
- `successfulIterations` / `peakParticles` / `peakObjects`

可选环境变量：

```bash
PROFILE_BROWSER_PORT=4798 PROFILE_EXPR_PARTICLES=1600 PROFILE_EXPR_VARIABLE_ITERS=5 PROFILE_EXPR_DURATION_MS=4000 npm run profile:browser-expressions
```

说明：命令会自行启动独立前端 dev server；对象选中与开抽屉通过开发态 profile harness 进入，但变量应用与抽屉恢复仍走真实页面 DOM。

### 2.9) Profile 输出结构与基线比对

四类 profile 脚本统一输出以下顶层字段：

- `schemaVersion`
- `reportType`
- `runtime`
- `generatedAt`
- `config`
- `profiles`
- `summaryRows`

其中 `profiles[]` 统一带有：

- `workload`：步数、采样粒度、对象/粒子规模、持续时间、迭代次数
- `peaks`：粒子 / 对象 / 轨迹 / parse 等峰值
- `timing`：`step` / `refresh` / `totalStep` / `frame`
- `longTask`：浏览器长任务统计
- `memory`：堆内存起始 / 峰值 / 结束
- `outcome`：交互类场景完成次数与最终状态
- `samples`：`checkpoints` / `snapshots` / `hintSamples` / `frameDeltas` / `longTaskDurations`

推荐将结果重定向到文件，便于跨时间比较：

```bash
npm --silent run profile:high-emission > output/profile-high-emission.json
npm --silent run profile:expressions > output/profile-expressions.json
PROFILE_BROWSER_PORT=4795 npm --silent run profile:browser-render > output/profile-browser-render.json
PROFILE_BROWSER_PORT=4796 npm --silent run profile:browser-expressions > output/profile-browser-expressions.json
```

治理口径与评审规则见：

- `docs/plans/2026-03-08-performance-baseline-governance.md`
- `docs/plans/2026-03-08-release-readiness-checklist.md`

### 3) 浏览器端关键路径（Playwright）

```bash
PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e
```

覆盖创建对象、属性编辑、播放、场景 IO、演示模式等用户关键流程。

说明：

- `frontend/playwright.config.ts` 支持通过 `PLAYWRIGHT_VITE_PORT` 指定独立端口
- 当本机端口环境较杂时，请换成任意未占用高位端口，例如 `4499`、`4599`
- 不要在 E2E 命令或 spec 中写死 `5173`

手机端专项回归（推荐在涉及触控改动时执行）：

```bash
PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- --project=phone-chromium
```

project / spec 分工：

- `desktop-chromium`：运行 `frontend/e2e/core-path.spec.ts`，覆盖桌面主链路与 demo mode 主流程。
- `tablet-chromium` / `phone-chromium`：运行 `frontend/e2e/touch-core-path.spec.ts`，覆盖触控、sheet 切换、safe-area、orientation 与 backdrop 恢复。
- `touch-core-path.spec.ts` 中的 `skip` 属于项目分流，不代表隐藏失败；看到 skip 时先确认当前 project 是否匹配目标场景。

Week2 Playwright helper 约定：

- `frontend/e2e/helpers/phoneFlows.ts`：封装 phone add / more / markdown / variables / scene / selected → property 流程。
- `frontend/e2e/helpers/assertions.ts`：封装 `more` 恢复、demo mode 状态等可复用断言。
- `openPhoneMoreSheet()` 按“确保 more 已打开”语义实现为幂等 helper；需要前置 `more` 可见时优先复用它，不要手写二次点击。
- `openMarkdownFromPhoneMore()` / `openVariablesFromPhoneMore()` 已内含“确保 more 可见”，不要先额外假设一次点击会保留 `more` 打开。

可用以下命令定向回归 phone 工具流：

```bash
PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- --project=phone-chromium --grep "core path|markdown|variables|utility drawer|scene sheet"
```

## 手机端交互验收基线（2026-02-28）

以下条目作为当前手机端交互门禁：

- 底部导航按钮触控高度 `>= 44px`
- 手机面板（如“更多”）核心按钮触控高度 `>= 44px`
- 手机属性面板折叠按钮与输入控件高度 `>= 44px`
- 面板下滑关闭手势在“手指滑出 header 再抬起”场景依然生效

可用以下命令快速回归核心项：

```bash
PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- --project=phone-chromium --grep "density|landscape|touch targets|swipe"
```

## 手工冒烟（推荐）

1. 启动：`npm run dev:frontend`
2. 访问终端提示地址（以 Vite 实际输出为准，不要写死 `http://localhost:5173`）
3. 验证以下路径：
- 拖拽创建对象并移动
- 打开属性面板并修改参数
- 播放/暂停/重置模拟
- 保存、加载、导入、导出场景
- 演示模式切换与缩放

## 常见问题

### 页面空白（http-server 直开）

`.vue` 和 `main.ts` 需要 Vite 编译，不能直接用 `http-server` 打开源码目录。  
请使用：

- 开发：`npm run dev:frontend`
- 静态部署：`npm run build:frontend` 后再服务 `dist`

### E2E 端口冲突 / 跑到错误页面

如果本机已有其它 Vite 应用占用常见端口，Playwright 可能无法启动到预期地址。请直接改用独立端口重跑：

```bash
PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e
```

如果 `4499` 也被占用，换成任意未占用高位端口即可。

## 历史手工调试页

旧版手工调试页已归档到：

- `docs/history/manual-tests/`

这些页面用于历史回溯，不属于当前 CI 流程，不作为 Vue 主线验收标准。
