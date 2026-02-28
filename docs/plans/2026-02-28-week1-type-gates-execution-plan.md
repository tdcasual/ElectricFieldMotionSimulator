# Week 1 Type Gates Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 5 个工作日内把前端类型检查从失败（23 errors）收敛到 0，并把 `typecheck` 纳入 CI 必过门禁。  
**Architecture:** 先修工具链与 CI（Node 类型、TS lib、脚本），再修业务类型错误，最后收敛 JS/TS 边界声明并补回归测试，避免“边修边扩散”。  
**Tech Stack:** TypeScript 5、Vue 3、Vitest、ESLint、GitHub Actions。

---

## Baseline (Day 0 Snapshot)

- 当前基线：
`npm run lint:frontend` PASS，`npm run build:frontend` PASS，`npm test` PASS，`npm run test:frontend` PASS，`npx tsc --noEmit -p frontend/tsconfig.json` FAIL（23 errors）。
- 当前错误分布：
TS7016 x16，TS2307 x3，TS2339 x1，TS2322 x1，TS2304 x1，TS18047 x1。
- 关键文件：
`frontend/src/runtime/simulatorRuntime.ts`、`frontend/src/stores/simulatorStore.ts`、`frontend/tsconfig.json`、`.github/workflows/frontend-rewrite-gates.yml`。

## Day 1 (Mon): Build Type Gate Skeleton

**Target:** 先让 CI 有 `typecheck` 门禁，避免“修完又回归”。  
**Files:**
- Modify: `package.json`
- Modify: `frontend/tsconfig.json`
- Modify: `.github/workflows/frontend-rewrite-gates.yml`

**Tasks:**
1. 新增脚本 `typecheck:frontend`。  
2. 在 CI 加 `Typecheck frontend` 步骤，位置在 lint 后、test 前。  
3. 给 `frontend/tsconfig.json` 增加 Node 类型与必要 lib（支持 `node:*` 与 `Disposable` 类型）。  
4. 安装 `@types/node` 为 devDependency。

**Commands:**
```bash
npm i -D @types/node
npm run lint:frontend
npx tsc --noEmit -p frontend/tsconfig.json
```

**Expected:**  
`lint` 通过；`tsc` 仍可能失败，但仅剩业务代码错误，不再有 Node 类型缺失造成的噪音错误。

**Acceptance:**
- `npm run typecheck:frontend` 可执行。
- CI workflow 中出现独立 typecheck gate。
- TS2307/TS2304 由配置缺失导致的问题清零。

## Day 2 (Tue): Fix Explicit Type Errors (Non-TS7016)

**Target:** 先清掉小而确定的类型错误，降低后续排查复杂度。  
**Files:**
- Modify: `frontend/src/stores/simulatorStore.ts`
- Modify: `frontend/test/drawer-host.test.ts`
- Modify: `frontend/test/scene-source-resolver.test.ts`

**Tasks:**
1. `normalizeBoundaryMode` 返回值显式收窄到 `'margin' | 'remove' | 'bounce' | 'wrap'`。  
2. `drawer-host` 测试里 `wrapper.get()` 返回类型问题改为 `find`/断言方式，移除 `exists` 类型冲突。  
3. `scene-source-resolver` 测试对 `result.ok` 做充分窄化，消除 `result.data` 可能为 `null`。

**Commands:**
```bash
npx tsc --noEmit -p frontend/tsconfig.json
npm run test:frontend -- drawer-host.test.ts scene-source-resolver.test.ts simulator-store.test.ts
```

**Expected:**  
非 TS7016 错误显著下降，仅剩 JS 边界相关错误为主。

**Acceptance:**
- TS2322/TS2339/TS18047 清零。
- 相关单测通过。

## Day 3 (Wed): Add Minimal Declarations for Legacy JS Bridge

**Target:** 收敛 TS7016 主体错误。  
**Files:**
- Create: `frontend/src/types/legacy-runtime.d.ts`
- Modify: `frontend/src/runtime/simulatorRuntime.ts`
- Modify: `frontend/src/stores/simulatorStore.ts`

**Tasks:**
1. 为 `js/core/*`、`js/interactions/*`、`js/utils/*`、`js/modes/*` 中当前被 TS 引用的模块补最小声明（只暴露当前真实使用的 API）。  
2. 在 `runtime/store` 去掉不必要的 `as unknown as` 风格桥接，优先使用声明约束。  
3. 确保声明不过度宽泛，避免把错误“吞掉”。

**Commands:**
```bash
npx tsc --noEmit -p frontend/tsconfig.json
npm run test:frontend -- simulator-runtime.test.ts simulator-store.test.ts
```

**Expected:**  
TS7016 大幅下降，`runtime/store` 可在严格模式下完成类型检查。

**Acceptance:**
- TS7016 从 16 降到 <= 4。
- `simulator-runtime` 和 `simulator-store` 单测通过。

## Day 4 (Thu): Finish TS7016 Cleanup + Boundary Hardening

**Target:** 把剩余 TS7016 清零，并加一条“防扩散”静态约束。  
**Files:**
- Modify: `frontend/src/types/legacy-runtime.d.ts`
- Modify: `eslint.config.js` (可选：补一条限制直接跨层导入规则)
- Modify: `frontend/test/layer-boundaries.test.ts` (如需同步命令)

**Tasks:**
1. 清掉剩余 TS7016。  
2. 加一条边界约束：禁止在新 TS 文件里直接引入未声明 legacy 路径（通过 lint 规则或约定路径实现）。  
3. 保持现有行为不变，禁止引入任何功能改动。

**Commands:**
```bash
npx tsc --noEmit -p frontend/tsconfig.json
npm run lint:frontend
npm run test:frontend
```

**Expected:**  
`tsc` 0 错；lint + 单测稳定。

**Acceptance:**
- TS error count = 0。
- `layer-boundaries` 相关测试通过。

## Day 5 (Fri): CI Finalization + Regression Sweep

**Target:** 把门禁固化并做完整回归。  
**Files:**
- Modify: `package.json`（若需要更新 `quality:all`）
- Modify: `.github/workflows/frontend-rewrite-gates.yml`
- Update: `docs/plans/2026-02-28-week1-type-gates-execution-plan.md`（回填结果）

**Tasks:**
1. 在 `quality:all` 链路加入 `typecheck:frontend`（建议在 lint 后）。  
2. 本地跑一遍完整质量链。  
3. 记录回归结果与已知风险（若有）。

**Commands:**
```bash
npm run quality:all
npx tsc --noEmit -p frontend/tsconfig.json
```

**Expected:**  
本地全绿，CI 同步全绿。

**Acceptance:**
- `quality:all` 包含 typecheck 且通过。
- CI job 全部通过（lint + node tests + frontend tests + e2e + typecheck）。

## Definition of Done (Week 1)

1. `npx tsc --noEmit -p frontend/tsconfig.json` 持续为 0 错。  
2. CI 含 typecheck 门禁且为阻断项。  
3. 无功能行为改动（仅类型/配置/测试适配）。  
4. 所有既有测试通过：`npm test`、`npm run test:frontend`、`npm run test:e2e`。  
5. 产出简短周报：错误从 23 -> 0，错误类型分布变化，新增门禁说明。

## Risks and Rollback

1. 风险：声明文件写得过宽，掩盖真实错误。  
回滚：收窄声明到“仅被调用 API”，并补负例测试。  
2. 风险：为过类型检查而引入运行时行为变化。  
回滚：限定改动范围到类型层，不改业务分支。  
3. 风险：CI 时长增加。  
回滚：先并行 job，再根据时长做缓存和任务拆分。

