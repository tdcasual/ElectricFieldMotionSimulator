# Two-Week Tech Debt Round 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在两周内继续降低当前主线的发布风险、复杂度风险和文档漂移风险，做到“可持续迭代”而不是“高频修补”。

**Architecture:** 先处理高风险的发布/兼容链路，再拆分高复杂模块（`DragDropManager`、`Renderer`），最后收敛测试与文档治理。坚持 TDD（先红后绿），每个子任务都包含回归验证与独立提交，避免一次性大改。

**Tech Stack:** Vue 3 + Pinia + TypeScript，legacy JS engine，Vitest，Node test runner，Playwright，Vite。

---

## Scope (10 working days)

- Week 1: 发布与兼容治理 + 复杂度拆分准备
- Week 2: 交互/渲染主干拆分 + E2E 结构化 + 文档漂移封口

## Non-goals

- 不做新用户功能
- 不做 UI 主题重设计
- 不引入新的运行时框架

## Baseline (before Day 1)

Run:

```bash
npm run lint:frontend
npm run typecheck:frontend
npm test
npm run test:frontend
npm run test:e2e
```

Expected:
- 全部通过（当前基线应与 2026-03-03 关闭报告一致）

---

### Task 1 (Day 1): Harden deployment contract (eliminate source-mode static deploy risk)

**Files:**
- Create: `test/deploy_contract.test.js`
- Modify: `Dockerfile`
- Modify: `vercel.json`
- Modify: `README.md`
- Modify: `QUICKSTART.md`

**Step 1: Write failing contract tests**
- 新增测试断言：
  - `Dockerfile` 不再直接 `COPY . /usr/share/nginx/html` 后裸跑源码。
  - Vercel 配置不再把仓库源码目录作为静态入口。
  - 文档明确“部署入口是 `frontend/dist` 构建产物”。

**Step 2: Run test to verify failure (RED)**

Run:
```bash
npm test -- test/deploy_contract.test.js
```

Expected:
- FAIL，指出当前部署契约与 Vue/Vite 构建模式不一致。

**Step 3: Implement minimal contract alignment (GREEN)**
- `Dockerfile` 改为 multi-stage：Node build -> Nginx serve `frontend/dist`。
- `vercel.json` 改为面向构建产物的配置。
- README/Quickstart 同步更新部署命令与入口路径。

**Step 4: Verify pass**

Run:
```bash
npm test -- test/deploy_contract.test.js
npm run build:frontend
```

Expected:
- 全通过。

**Step 5: Commit**

```bash
git add test/deploy_contract.test.js Dockerfile vercel.json README.md QUICKSTART.md
git commit -m "refactor(deploy): align docker/vercel with vite build artifact contract"
```

---

### Task 2 (Day 2): Add legacy scene migration CLI (reduce hard-cut compatibility pain)

**Files:**
- Create: `scripts/migrate-scene-v1-to-v2.mjs`
- Create: `test/scene_migration_cli.test.js`
- Modify: `package.json`
- Modify: `docs/migration/scene-compatibility-policy.md`

**Step 1: Write failing migration tests**
- 输入 v1 样本，输出 v2 结构（`version: "2.0"`, `objects`）
- 非法输入返回非 0 exit code。

**Step 2: Run RED test**

Run:
```bash
npm test -- test/scene_migration_cli.test.js
```

Expected:
- FAIL（脚本不存在）。

**Step 3: Implement minimal CLI**
- 支持 `--in` / `--out`。
- 仅做必要字段映射（YAGNI），不做运行时魔改。
- 保留未识别字段到 `extras`（如有）以降低信息丢失。

**Step 4: Verify GREEN**

Run:
```bash
npm test -- test/scene_migration_cli.test.js
node scripts/migrate-scene-v1-to-v2.mjs --in ./output/playwright/fixtures/legacy-scene-v1.json --out ./output/playwright/fixtures/legacy-scene-v2.json || true
```

Expected:
- 测试通过；CLI 行为稳定。

**Step 5: Commit**

```bash
git add scripts/migrate-scene-v1-to-v2.mjs test/scene_migration_cli.test.js package.json docs/migration/scene-compatibility-policy.md
git commit -m "feat(scene): add v1-to-v2 migration cli and policy guidance"
```

---

### Task 3 (Day 3): Wire migration hint into import failure UX

**Files:**
- Modify: `frontend/src/stores/simulatorStore.ts`
- Modify: `frontend/test/simulator-store.test.ts`
- Modify: `frontend/e2e/touch-core-path.spec.ts`

**Step 1: Write failing tests**
- 当导入 `version !== 2.0` 时，状态文案包含“仅支持 2.0”与迁移指引。

**Step 2: RED run**

Run:
```bash
npm run test:frontend -- frontend/test/simulator-store.test.ts
npm run test:e2e -- frontend/e2e/touch-core-path.spec.ts --project=phone-chromium --grep "legacy import"
```

Expected:
- FAIL（当前文案未包含迁移指引）。

**Step 3: Minimal implementation**
- 在 store 层统一版本错误提示文案。
- 保持其他错误分支语义不变。

**Step 4: GREEN verify**

Run:
```bash
npm run test:frontend -- frontend/test/simulator-store.test.ts
npm run test:e2e -- frontend/e2e/touch-core-path.spec.ts --project=phone-chromium --grep "legacy import"
```

Expected:
- 通过。

**Step 5: Commit**

```bash
git add frontend/src/stores/simulatorStore.ts frontend/test/simulator-store.test.ts frontend/e2e/touch-core-path.spec.ts
git commit -m "fix(import): surface explicit scene migration guidance for non-v2 payloads"
```

---

### Task 4 (Day 4): Extract DragDropManager pointer lifecycle module

**Files:**
- Create: `js/interactions/pointerLifecycle.js`
- Modify: `js/interactions/DragDropManager.js`
- Create: `test/pointer_lifecycle_contract.test.js`
- Modify: `test/dragdrop_manager_dom.test.js`

**Step 1: Write failing extraction contract tests**
- 断言 pointer down/move/up/cancel 的状态迁移保持现行为。

**Step 2: RED run**

Run:
```bash
npm test -- test/pointer_lifecycle_contract.test.js test/dragdrop_manager_dom.test.js
```

Expected:
- FAIL（新模块未接入）。

**Step 3: Extract minimal logic**
- 提取状态机与通用阈值判断，不改变业务语义。
- `DragDropManager` 仅保留 orchestration。

**Step 4: GREEN verify**

Run:
```bash
npm test -- test/pointer_lifecycle_contract.test.js test/dragdrop_manager_dom.test.js
```

Expected:
- 通过。

**Step 5: Commit**

```bash
git add js/interactions/pointerLifecycle.js js/interactions/DragDropManager.js test/pointer_lifecycle_contract.test.js test/dragdrop_manager_dom.test.js
git commit -m "refactor(interaction): extract pointer lifecycle state module"
```

---

### Task 5 (Day 5): Extract DragDropManager geometry/tangency orchestration module

**Files:**
- Create: `js/interactions/geometryInteractionController.js`
- Modify: `js/interactions/DragDropManager.js`
- Create: `test/geometry_interaction_controller.test.js`
- Modify: `test/dragdrop_helpers.test.js`

**Step 1: Add failing tests**
- 覆盖 resize、vertex drag、tangency snap、geometry overlay 更新。

**Step 2: RED run**

Run:
```bash
npm test -- test/geometry_interaction_controller.test.js test/dragdrop_helpers.test.js
```

Expected:
- FAIL。

**Step 3: Minimal extraction**
- 提取几何交互计算与提示同步逻辑。
- 保留公开行为与事件时序。

**Step 4: GREEN verify**

Run:
```bash
npm test -- test/geometry_interaction_controller.test.js test/dragdrop_helpers.test.js test/dragdrop_manager_dom.test.js
```

Expected:
- 通过。

**Step 5: Commit**

```bash
git add js/interactions/geometryInteractionController.js js/interactions/DragDropManager.js test/geometry_interaction_controller.test.js test/dragdrop_helpers.test.js
git commit -m "refactor(interaction): extract geometry and tangency controller"
```

---

### Task 6 (Day 6): Split renderer field/device rendering into dedicated modules

**Files:**
- Create: `js/rendering/electricFieldRenderer.js`
- Create: `js/rendering/magneticFieldRenderer.js`
- Create: `js/rendering/deviceRenderer.js`
- Modify: `js/core/Renderer.js`
- Modify: `test/electric_field_rendering.test.js`
- Modify: `test/magnetic_field_rendering.test.js`

**Step 1: Write failing module-boundary tests**
- `Renderer` 不直接承载电场/磁场几何细节。

**Step 2: RED run**

Run:
```bash
npm test -- test/electric_field_rendering.test.js test/magnetic_field_rendering.test.js
```

Expected:
- FAIL。

**Step 3: Minimal split**
- 将 `drawElectricField`、`drawMagneticField` 主体下沉。
- `Renderer` 仅负责层级调度和通用 helper。

**Step 4: GREEN verify**

Run:
```bash
npm test -- test/electric_field_rendering.test.js test/magnetic_field_rendering.test.js test/particle_centroid_hint_rendering.test.js
```

Expected:
- 通过。

**Step 5: Commit**

```bash
git add js/rendering/electricFieldRenderer.js js/rendering/magneticFieldRenderer.js js/rendering/deviceRenderer.js js/core/Renderer.js test/electric_field_rendering.test.js test/magnetic_field_rendering.test.js
git commit -m "refactor(renderer): split field and device rendering modules"
```

---

### Task 7 (Day 7): Decompose phone E2E spec to reduce skip noise

**Files:**
- Create: `frontend/e2e/phone-touch-gestures.spec.ts`
- Create: `frontend/e2e/phone-import-recovery.spec.ts`
- Create: `frontend/e2e/phone-safe-area.spec.ts`
- Modify: `frontend/e2e/touch-core-path.spec.ts`
- Modify: `frontend/playwright.config.ts`

**Step 1: Write failing structure tests / assertions**
- 将 phone-only 用例从“同文件条件 skip”迁移到 phone 专属 spec。

**Step 2: RED run**

Run:
```bash
npm run test:e2e -- --project=phone-chromium
```

Expected:
- FAIL（拆分前后匹配规则未对齐）。

**Step 3: Minimal restructuring**
- 减少 `testInfo.project.name !== 'phone-chromium'` guard。
- 保持业务断言不变。

**Step 4: GREEN verify**

Run:
```bash
npm run test:e2e -- --project=phone-chromium
npm run test:e2e -- --project=tablet-chromium
npm run test:e2e -- --project=desktop-chromium
```

Expected:
- 全部通过，skip 数显著下降。

**Step 5: Commit**

```bash
git add frontend/e2e/*.spec.ts frontend/playwright.config.ts
git commit -m "refactor(e2e): split phone-only scenarios to dedicated specs"
```

---

### Task 8 (Day 8): Pay down TS bridge debt in tests and runtime boundaries

**Files:**
- Modify: `frontend/src/types/legacy-runtime.d.ts`
- Modify: `frontend/test/simulator-runtime.test.ts`
- Modify: `frontend/test/simulator-store.test.ts`
- Modify: `frontend/test/app-shell.test.ts`

**Step 1: Add failing type assertions / compile checks**
- 降低 `as unknown as` 使用点，优先补类型声明。

**Step 2: RED run**

Run:
```bash
npm run typecheck:frontend
npm run test:frontend -- frontend/test/simulator-runtime.test.ts frontend/test/simulator-store.test.ts frontend/test/app-shell.test.ts
```

Expected:
- FAIL（暴露声明不足）。

**Step 3: Minimal type tightening**
- 在 `legacy-runtime.d.ts` 补足当前真实使用 API。
- 测试用显式 helper 类型替代重复 cast。

**Step 4: GREEN verify**

Run:
```bash
npm run typecheck:frontend
npm run test:frontend -- frontend/test/simulator-runtime.test.ts frontend/test/simulator-store.test.ts frontend/test/app-shell.test.ts
```

Expected:
- 全通过。

**Step 5: Commit**

```bash
git add frontend/src/types/legacy-runtime.d.ts frontend/test/simulator-runtime.test.ts frontend/test/simulator-store.test.ts frontend/test/app-shell.test.ts
git commit -m "refactor(types): tighten legacy bridge declarations and reduce unsafe casts"
```

---

### Task 9 (Day 9): Add docs drift guard + sync stale docs

**Files:**
- Create: `test/docs_drift.test.js`
- Modify: `QUICKSTART.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/plans/2026-03-02-geometry-v2-hardcut-implementation-plan.md`
- Modify: `docs/README.md`

**Step 1: Write failing docs drift tests**
- 快速检查关键文档是否仍引用过时 scene 字段模型（`electricFields/magneticFields/particles`）。
- 检查计划状态是否与 closure report 冲突（至少人工确认后回填）。

**Step 2: RED run**

Run:
```bash
npm test -- test/docs_drift.test.js
```

Expected:
- FAIL（当前 QUICKSTART 仍有旧字段说明）。

**Step 3: Minimal sync fixes**
- 更新 QUICKSTART 的 scene 格式说明为 `version/settings/objects`。
- 在对应 plan 文档回填真实状态。
- 在 docs index 添加该轮偿债入口。

**Step 4: GREEN verify**

Run:
```bash
npm test -- test/docs_drift.test.js
rg -n "electricFields|magneticFields|particles" QUICKSTART.md docs || true
```

Expected:
- drift test 通过；关键文档不再包含过时必填字段描述。

**Step 5: Commit**

```bash
git add test/docs_drift.test.js QUICKSTART.md CHANGELOG.md docs/plans/2026-03-02-geometry-v2-hardcut-implementation-plan.md docs/README.md
git commit -m "docs: add drift guard and align quickstart/plan status with current contract"
```

---

### Task 10 (Day 10): Final regression, closure report, and rollback notes refresh

**Files:**
- Create: `docs/release/2026-03-17-tech-debt-round2-closure-report.md`
- Modify: `docs/release/frontend-rewrite-launch-checklist.md`
- Modify: `docs/release/frontend-rewrite-rollback-runbook.md`

**Step 1: Run full quality chain**

Run:
```bash
npm run quality:all
```

Expected:
- 全通过。

**Step 2: Add closure evidence**
- 记录各任务 commit、测试输出摘要、已知风险与后续建议。

**Step 3: Refresh operational docs**
- 回填本轮检查时间与结果。
- 对新增迁移 CLI 与部署契约更新 runbook。

**Step 4: Verification rerun**

Run:
```bash
npm run lint:frontend
npm run typecheck:frontend
npm test
npm run test:frontend
npm run test:e2e
```

Expected:
- 全部通过。

**Step 5: Commit**

```bash
git add docs/release/2026-03-17-tech-debt-round2-closure-report.md docs/release/frontend-rewrite-launch-checklist.md docs/release/frontend-rewrite-rollback-runbook.md
git commit -m "docs(release): publish round2 debt paydown closure and refresh ops checklists"
```

---

## Daily execution checklist

- 每天开始先拉基线：`npm run typecheck:frontend && npm test`
- 每个任务保持 RED -> GREEN -> REFACTOR
- 每个任务单独 commit，避免跨任务混改
- 任何行为变更都要同步 `docs/` 对应入口

## Success criteria

- 发布契约不再依赖源码静态托管
- legacy 场景有可用迁移工具与导入提示
- `DragDropManager` 与 `Renderer` 复杂度明显下降
- phone E2E skip 噪音显著下降
- 文档与实现契约一致，存在自动 drift guard

