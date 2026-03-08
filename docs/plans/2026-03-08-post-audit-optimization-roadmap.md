# Post-Audit Optimization Roadmap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 基于本轮审计结果，在不扩大产品行为面的前提下，分 1 周 / 2 周 / 1 月三个阶段降低状态复杂度、提升测试稳定性、沉淀性能治理与移动端交互规范。

**Architecture:** 先处理最容易反复出错的 A/D/E 交界状态链，把 `sheet ↔ drawer ↔ selection ↔ demo mode ↔ runtime` 收敛为更稳定的会话态模型；再把浏览器回归和 IO 契约测试从“能覆盖”升级为“可维护、可诊断”；最后把 profiling、移动端规范和发布门禁治理化，避免同类问题再次以不同形式回归。

**Tech Stack:** Vue 3、TypeScript、Pinia、Vitest、Node.js test runner、Playwright、Vite、Markdown 文档。

**Status Update (2026-03-08):**

- Task 1（第 1 周）已完成：状态链 helper、会话恢复测试与定向 Vitest 回归已落地。
- Task 2（第 2 周）已完成：Playwright helper 抽取、IO / embed 契约测试、测试指南更新与全量浏览器回归已落地。
- Task 3（第 1 个月）已完成：profile 输出结构统一、stdout/stderr 分流、性能治理文档、移动端规范文档与发布前 checklist 已落地。

---

### Task 1: 第 1 周 —— 收敛高风险状态链

**Files:**
- Modify: `frontend/src/stores/simulatorStore.ts`
- Modify: `frontend/src/modes/usePhoneSheets.ts`
- Modify: `frontend/src/runtime/simulatorRuntime.ts`
- Modify: `frontend/src/App.vue`
- Test: `frontend/test/simulator-store.test.ts`
- Test: `frontend/test/use-phone-sheets.test.ts`
- Test: `frontend/test/app-shell.test.ts`
- Reference: `docs/plans/2026-03-08-project-audit-final-report.md`

**Step 1: 定义“会话态”边界**

- 明确哪些属于持久化场景数据，哪些属于运行期 / authoring 会话态。
- 建议最先抽离：`selectedObjectId`、`activeDrawer`、`phoneActiveSheet`、`demoMode` 相关恢复意图。

**Step 2: 设计统一状态转移表**

- 把以下链路整理成显式 transition 规则：
  - `selected -> property -> close -> selected`
  - `more -> markdown -> close -> more`
  - `more -> variables -> close -> more`
  - `edit -> demo -> edit`（恢复 selection / property / selected sheet）
- 产物建议：一个小型状态转移表文档或 store 内部统一 helper，而不是继续分散在 watcher 中修补。

**Step 3: 先补失败测试**

- 在 `frontend/test/simulator-store.test.ts` 中追加“会话态恢复 contract”测试。
- 在 `frontend/test/use-phone-sheets.test.ts` 中追加“sheet 挂起/恢复”测试。
- 在 `frontend/test/app-shell.test.ts` 中追加“真实入口触发 + 恢复后 UI 状态”测试。

**Step 4: 最小实现状态收敛**

- 优先引入一个统一 helper（例如 `session restoration` / `authoring context transition`），避免多个 watcher 互相抢状态。
- 保持外部行为不变，只减少恢复链分散逻辑。

**Step 5: 跑定向回归**

Run: `npm run test:frontend -- simulator-store use-phone-sheets app-shell`
Expected: 全绿，且不新增通过“补 if”维持的脆弱逻辑。

**阶段完成标准**

- A/D/E 交界的恢复链不再依赖多处隐式 watcher 兜底。
- demo mode、selected sheet、property drawer 的恢复语义可被一句话说明清楚。

### Task 2: 第 2 周 —— 把验证体系从“覆盖”升级为“治理”

**Files:**
- Modify: `frontend/e2e/touch-core-path.spec.ts`
- Modify: `frontend/e2e/core-path.spec.ts`
- Modify: `frontend/playwright.config.ts`
- Create: `frontend/e2e/helpers/phoneFlows.ts`
- Create: `frontend/e2e/helpers/assertions.ts`
- Test: `test/e2e_url_consistency.test.js`
- Reference: `TESTING-GUIDE.md`

**Step 1: 抽取 Playwright 场景 helper**

- 把重复的 phone 工具流整理成 helper，例如：
  - 打开 `more` 后进入 `markdown`
  - 关闭 utility drawer 并恢复来源 sheet
  - 打开 `selected` 后进入 property
- 降低“产品语义变了，十几条 spec 同时过时”的维护成本。

**Step 2: 整理 project / spec 分层**

- 明确 desktop / phone / tablet 断言分工。
- 对大量 `skip` 的用例做整理：确保是“预期分流”而不是“组织不清”。

**Step 3: 增加 IO / embed 契约测试**

- 为 `save / load / import / export / embed / host` 增加统一错误 code / message contract 检查。
- 目标不是增加更多 UI 测试，而是保证同一 payload 在多入口下的边界和反馈一致。

**Step 4: 更新测试指南**

- 在 `TESTING-GUIDE.md` 中加入：
  - 哪些是必须门禁
  - 哪些是 phone-only / tablet-only
  - 哪些 helper 对应哪类回归问题

**Step 5: 跑浏览器回归**

Run: `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e`
Expected: 全量通过；`skip` 仅来自预期的 layout/project 分流。

**阶段完成标准**

- E2E 断言不再大量耦合具体 UI 打开顺序。
- 失败时能快速判断是“真实回归”还是“测试假设漂移”。

### Task 3: 第 1 个月 —— 治理性能基线与移动端交互规范

**Files:**
- Modify: `scripts/profile-high-emission.mjs`
- Modify: `scripts/profile-expressions.mjs`
- Modify: `scripts/profile-browser-render.mjs`
- Modify: `scripts/profile-browser-expressions.mjs`
- Modify: `TESTING-GUIDE.md`
- Modify: `docs/documentation-system.md`
- Create: `docs/plans/2026-03-xx-mobile-interaction-guidelines.md`
- Create: `docs/plans/2026-03-xx-performance-baseline-governance.md`
- Test: `test/high_emission_profile.test.js`
- Test: `test/expression_binding_profile.test.js`
- Test: `test/browser_render_profile.test.js`
- Test: `test/browser_expression_ui_profile.test.js`

**Step 1: 统一 profile 输出格式**

- 让四类 profile 脚本输出固定 JSON 结构。
- 至少统一：场景名、对象规模、粒子峰值、帧时、long-task、堆内存、时间戳。

**Step 2: 建立“趋势”而非“硬阈值”治理**

- 初期不要把波动较大的性能数字直接做成 CI fail。
- 先建立基线快照和趋势对比脚本，优先发现“显著退化”。

**Step 3: 固化移动端交互规范**

- 把已通过测试守住的规则升级成设计规范：
  - 触控目标 >= 44px
  - safe-area 下 header / nav / drawer 不越界
  - utility drawer 关闭后返回来源上下文
  - 危险操作必须分区且反馈明确

**Step 4: 沉淀发布前回归清单**

- 输出一页 checklist，覆盖：
  - 创建 / 编辑 / 播放 / demo mode
  - import / export / embed
  - phone more / markdown / variables / property
  - 高频发射 / expression / trajectories

**Step 5: 运行性能与浏览器 profile 回归**

Run: `npm run profile:high-emission`
Run: `npm run profile:expressions`
Run: `npm run profile:browser-render`
Run: `npm run profile:browser-expressions`
Expected: 输出结构统一，可做历史比较，不要求首轮就设硬失败阈值。

**阶段完成标准**

- G 区从“已有 profiling 脚本”升级为“可持续治理”。
- H 区从“测试里隐含规则”升级为“文档化设计规范 + 发布门禁”。

### Task 4: 沟通与里程碑管理

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `docs/plans/2026-03-08-project-audit-final-report.md`
- Optional Create: `docs/plans/2026-03-xx-release-readiness-checklist.md`

**Step 1: 每阶段结束都回填结果**

- 第 1 周：回填状态模型收敛结果与新增 / 删除的恢复逻辑。
- 第 2 周：回填 E2E helper、contract test 与测试分层。
- 第 1 个月：回填性能治理与移动端规范文档。

**Step 2: 统一对外汇报口径**

- 对管理层：强调“审计完成后进入结构化优化阶段，不再以零散修 bug 为主”。
- 对研发/测试：强调“优先治理状态模型、验证契约和性能基线”。

**Step 3: 设置里程碑验收问题**

- 第 1 周结束：能否用一张图说清 UI 状态转移？
- 第 2 周结束：E2E 失败时能否在 10 分钟内定位是产品回归还是测试假设回归？
- 第 1 月结束：性能变化能否通过结构化 profile 输出被稳定比较？
