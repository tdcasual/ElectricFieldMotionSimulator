# 性能基线治理规范

日期：2026-03-08
状态：当前主线

## 目标

把项目已有的 profiling 脚本从“单次排查工具”升级为“可持续比较的基线产物”，让性能变化能够被结构化记录、跨时间比较、并在发布前被快速复核。

## 覆盖范围

当前纳入统一治理的 4 类 profile：

- `npm run profile:high-emission`
- `npm run profile:expressions`
- `npm run profile:browser-render`
- `npm run profile:browser-expressions`

它们分别覆盖：

- 高频发射与轨迹保留策略
- expression 绑定刷新负载
- 浏览器真实渲染线程负载
- expression UI 与属性/变量面板联动负载

## 统一输出约定

四类脚本统一输出以下顶层 JSON 结构：

```json
{
  "schemaVersion": "1.0",
  "reportType": "high-emission | expression-bindings | browser-render | browser-expression-ui",
  "runtime": "node | browser",
  "generatedAt": "ISO-8601",
  "config": {},
  "profiles": [],
  "summaryRows": []
}
```

`profiles[]` 统一包含以下分区：

- `collectedAt`：当前 profile 记录时间
- `name`：场景名
- `workload`：对象规模、粒子规模、步数、采样粒度、持续时间、迭代次数
- `peaks`：粒子峰值、对象峰值、轨迹点峰值、parse 调用峰值等
- `timing`：`step` / `refresh` / `totalStep` / `frame` 四类时间指标
- `longTask`：长任务计数、总耗时、最大耗时
- `memory`：堆内存起始 / 峰值 / 结束
- `outcome`：交互类场景的完成次数、hint 变化、最终状态
- `samples`：`checkpoints` / `snapshots` / `hintSamples` / `frameDeltas` / `longTaskDurations`
- `raw`：原始 profile，便于向后兼容与二次分析

## 治理原则

### 1. 先做趋势，不做硬失败阈值

当前阶段不把轻微数值波动直接当成 CI fail，原因如下：

- 浏览器渲染、long-task 和堆内存对机器环境敏感
- 真实回归往往表现为“持续偏离”而不是一次性尖峰
- 先建立可比较的结构化输出，比仓促设阈值更有价值

**例外：构建产物体积从 2026-03-08 起纳入硬门禁。**

- 使用 `npm run build:frontend && npm run verify:budgets` 执行当前 baseline guard
- 使用 `npm run verify:budgets:target` 跟踪 500 KiB 目标 guard
- 当前参考基线见 `docs/release/2026-03-08-optimization-baseline.md`

### 2. 比较必须同维度

比较历史结果时，必须保证以下维度一致：

- `reportType`
- `profile.name`
- `config` 中的核心参数（如 `steps`、`dt`、`particleCount`、`durationMs`、`sampleEveryMs`）
- 浏览器 profile 的采样环境（headless/headful、端口、viewport）

### 3. 优先关注显著退化

首轮比较建议优先看：

- `timing.step.p95Ms` / `timing.totalStep.p95Ms`
- `timing.frame.p95Ms` / `timing.frame.maxMs`
- `longTask.count` / `longTask.maxMs`
- `memory.heapUsedPeakMB`
- `peaks.particles` / `peaks.trajectoryPoints`

## 推荐工作流

### 本地记录一次基线

```bash
npm --silent run profile:high-emission > output/profile-high-emission.json
npm --silent run profile:expressions > output/profile-expressions.json
PROFILE_BROWSER_PORT=4795 npm --silent run profile:browser-render > output/profile-browser-render.json
PROFILE_BROWSER_PORT=4796 npm --silent run profile:browser-expressions > output/profile-browser-expressions.json
```

### 评审时的最小核对项

- 同一场景名是否存在异常增大的 `p95` / `max`
- `longTask` 是否由 0 变成持续出现
- `heapUsedPeakMB` 是否比最近一次稳定记录明显抬高
- 高频发射下 `peakTrajectoryPoints` 是否出现非预期放大
- expression UI 交互是否出现 `successfulIterations` 下降或 `hintChangeCount` 异常

## 发布门禁建议

发布前至少保留以下检查：

- 构建与预算：`npm run build:frontend && npm run verify:budgets`
- Profile 契约：`npm run verify:profiles:contracts`
- Node profiling：`high-emission`、`expressions`
- Browser profiling：`browser-render`、`browser-expressions`
- 若只改动 G 区 / expression 路径，可优先执行对应两条 profile
- 若改动影响 mobile drawer / property / variable 交互，必须同时跑 phone E2E
- 若需要完整发布前门禁，可直接执行 `PLAYWRIGHT_VITE_PORT=4499 npm run quality:release`

## 结论

当前阶段的重点不是“把性能数字变成硬阈值”，而是先把结果变成稳定、可比较、可追溯的数据结构。后续若积累了 2-3 轮稳定样本，再考虑引入自动趋势判定或回归告警。
