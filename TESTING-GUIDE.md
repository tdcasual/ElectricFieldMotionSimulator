# 测试指南（Vue3 主线）

更新时间：2026-03-14

## 环境要求

- Node.js 20+
- npm 10+

## 快速入口

| 场景 | 命令 | 用途 |
| --- | --- | --- |
| smoke | `npm run test:smoke` | 快速确认桌面核心路径与 embed host 没有明显回归 |
| engine regression | `npm run test:engine:regression` | 回归引擎、对象、序列化、交互核心逻辑 |
| frontend regression | `npm run test:frontend:regression` | 回归 Vue 组件、store、runtime/embed 桥接 |
| phone regression | `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e:phone` | 只看手机触控、长按、pinch、底部抽屉链路 |
| release gate | `PLAYWRIGHT_VITE_PORT=4499 npm run release:gate` | 发布前统一门禁；`npm run quality:release` 是兼容别名 |

## UI Refresh Verification

2026-03-14 的壳层与视觉刷新建议至少执行下面这组检查：

- `npm run lint:frontend`
- `npm run typecheck:frontend`
- `npm run test:frontend`
- `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- frontend/e2e/core-path.spec.ts frontend/e2e/touch-core-path.spec.ts frontend/e2e/responsive-visual.spec.ts`

如果本次改动本来就会改变视觉基线，需要先人工确认桌面浅色、桌面深色、手机竖屏、手机横屏、平板五组截图都是“预期变化”，再执行：

```bash
PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- frontend/e2e/responsive-visual.spec.ts --update-snapshots
```

补充检查点：

- 对照 `docs/release/2026-03-14-ui-baseline.md` 确认桌面头部、画布空状态和手机 sheet 层级是否仍符合刷新后的设计契约。
- 如果改动涉及手机壳层或 safe-area，优先关注 `touch-core-path.spec.ts` 是否仍通过底部导航、sheet 和属性面板相关断言。

## 日常质量门禁

### 一键全量回归

```bash
PLAYWRIGHT_VITE_PORT=4499 npm run quality:all
```

该命令会串行执行：

- `npm run lint:frontend`
- `npm run typecheck:frontend`
- `npm run test:engine:regression`
- `npm run test:frontend:regression`
- `npm run test:e2e`

### 发布前主门禁

```bash
PLAYWRIGHT_VITE_PORT=4499 npm run release:gate
```

`release:gate` 会串行执行：

- `npm run lint:frontend`
- `npm run typecheck:frontend`
- `npm run test:engine:regression`
- `npm run test:frontend:regression`
- `npm run build:frontend`
- `npm run verify:budgets`
- `npm run verify:profiles:contracts`
- `npm run verify:profiles:budgets`
- `npm run test:e2e`

补充说明：

- `npm run quality:release` 仍保留，等价于 `npm run release:gate`。
- `npm run verify:budgets:target` 是更严格的 bundle 目标线，适合作为抽样加跑，不强制纳入默认 release gate。
- 当前基线记录见 `docs/release/2026-03-08-optimization-baseline.md`。
- 发布分层矩阵见 `docs/release/2026-03-08-optimization-verification-matrix.md`。

## 分层测试说明

### 1) 引擎与核心逻辑（Node）

```bash
npm run test:engine:regression
```

覆盖：

- 物理引擎更新与对象行为
- 发射器、轨迹、对象注册
- 序列化 / 导入导出契约
- 旧引擎交互控制器与渲染辅助逻辑

### 2) Vue 组件与状态层（Vitest）

```bash
npm run test:frontend:regression
```

覆盖：

- `App` 壳层与工具栏
- `simulatorStore`、session、runtime snapshot 同步
- embed/bootstrap/host bridge
- 属性抽屉、变量表、profile harness 等前端桥接层

如只回归 embed / IO / runtime 契约，可执行：

```bash
npm run test:frontend -- scene-validation-contract scene-source-resolver host-bridge embed-bootstrap runtime-snapshot-sync profile-harness
```

### 3) Playwright 真机链路（桌面 / 平板 / 手机）

```bash
PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e
```

项目分流规则：

- `desktop-chromium`
  - 负责桌面主链路、embed 协议、响应式视觉基线。
  - 明确排除 `touch-core-path.spec.ts`，因为触控职责不在桌面项目里。
- `tablet-chromium`
  - 只运行 `touch-core-path.spec.ts`，用于验证触控布局与平板交互基线。
  - 规格里出现的 `skip` 代表“这条断言属于 phone-only 设计”，不是未知失败或临时跳过。
- `phone-chromium`
  - 运行完整手机触控回归，包括长按、pinch、底部导航、selected sheet / more sheet 等链路。

若只想快速验证手机链路：

```bash
PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e:phone
```

若只做桌面 smoke：

```bash
PLAYWRIGHT_VITE_PORT=4499 npm run test:smoke
```

## Profiling 与预算门禁

### Profile contract checks

```bash
npm run verify:profiles:contracts
```

用途：

- 锁定 report schema 与 summary 字段
- 防止 profile 输出结构被静默改坏
- 不替代真实 profile 采样

### Profile budget checks

```bash
npm run verify:profiles:budgets
```

用途：

- 自动运行 `profile:high-emission` 与 `profile:browser-render`
- 对关键指标执行预算判断
- 直接捕获轨迹爆炸、FPS 回落、long-task 回归

### 可单独运行的 profile 命令

#### 高频发射（Node）

```bash
npm run profile:high-emission
```

输出重点：

- `peakParticles` / `peakObjects` / `peakTrajectoryPoints`
- `avgStepMs` / `p95StepMs` / `maxStepMs`
- 堆内存走势

可选参数：

```bash
PROFILE_STEPS=240 PROFILE_SAMPLE_EVERY=20 npm run profile:high-emission
```

#### Expression 绑定（Node）

```bash
npm run profile:expressions
```

输出重点：

- `peakParseCalls` / `peakActiveParticles`
- `avgRefreshMs` / `p95RefreshMs`
- `avgTotalStepMs` / `p95TotalStepMs`

可选参数：

```bash
PROFILE_PARTICLES=3200 PROFILE_STEPS=90 npm run profile:expressions
```

#### Browser render（Chromium）

```bash
npm run profile:browser-render
```

输出重点：

- `avgFps` / `p95FrameMs` / `maxFrameMs`
- `longTaskCount` / `longTaskTotalMs` / `longTaskMaxMs`
- `frameStats` 快照，用于判断是真实浏览器主线程压力还是模拟侧退化

可选参数：

```bash
PROFILE_BROWSER_PORT=4795 PROFILE_DURATION_MS=5000 npm run profile:browser-render
```

#### Browser expression UI（Chromium）

```bash
npm run profile:browser-expressions
```

用于验证属性抽屉 / 变量表 / expression hint 的浏览器主线程表现。

## 推荐执行顺序

### 本地改动后的最小回归

```bash
npm run test:engine:regression
npm run test:frontend:regression
```

### 触控或移动端改动

```bash
PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e:phone
```

### 发布前

```bash
npm run build:frontend
npm run verify:budgets
npm run verify:profiles:contracts
npm run verify:profiles:budgets
PLAYWRIGHT_VITE_PORT=4499 npm run release:gate
```
