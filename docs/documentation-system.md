# 文档系统规范

最后更新：2026-02-28

## 目标

建立统一、可维护、可追溯的项目文档系统，确保以下原则：

- 单一入口：所有文档从 `docs/README.md` 可导航
- 代码同步：行为变更必须同步更新文档
- 主线清晰：当前文档与历史归档明确分层
- 可验证：测试与验收标准有明确命令和阈值

## 文档分层

### 根目录文档（项目入口）

- `README.md`：产品能力、快速入口、主文档索引
- `QUICKSTART.md`：本地启动与最短上手路径
- `TESTING-GUIDE.md`：分层测试策略与验收清单
- `CHANGELOG.md`：对外可见的变更记录

### `docs/` 主线文档（工作文档）

- `docs/migration/`：架构与迁移基线
- `docs/plans/`：进行中或近期执行计划
- `docs/release/`：发布检查与回滚预案
- `docs/embed-protocol.md` 等专题文档

### `docs/history/` 归档文档（追溯文档）

- 已完成且不再作为当前实现依据的设计/计划
- 历史手工调试资源

## 命名规则

### 计划/设计文档

- 格式：`YYYY-MM-DD-<topic>.md`
- 要求：文件名主题明确，避免 `misc`、`temp`、`new` 等模糊词

### 规范类文档

- 使用语义明确的稳定文件名，如：
  - `documentation-system.md`
  - `embed-protocol.md`

## 何时必须更新文档

以下变更必须同步更新至少一个文档入口：

1. 交互行为变更（尤其移动端触控、手势、快捷路径）
2. 测试策略或阈值变更
3. 架构边界或模块职责变更
4. 发布流程、回滚流程变更
5. 新增文档目录或新增关键文档

## 文档更新矩阵

- 交互/UX行为变更：更新 `README.md`（若用户可感知）与 `TESTING-GUIDE.md`
- 测试阈值变更：更新 `TESTING-GUIDE.md`
- 重大修复与能力调整：更新 `CHANGELOG.md`
- 新计划或设计：新增到 `docs/plans/`，并在 `docs/README.md` 可发现
- 历史化文档：移动到 `docs/history/` 并更新 `docs/history/README.md`

## 提交流程（文档门禁）

在宣告完成前，至少执行以下检查：

```bash
rg -n "docs/README.md|documentation-system|mobile|touch|swipe" README.md TESTING-GUIDE.md docs/README.md docs/documentation-system.md
```

如涉及移动端交互，必须至少运行一次手机端 E2E：

```bash
npm run test:e2e -- --project=phone-chromium
```

## 归档策略

- 计划已执行完且不再作为当前迭代依据时，迁移到 `docs/history/plans/`
- 保留原文件名，避免时间线断裂
- 在 `docs/history/README.md` 补充索引

## 评审清单

提交前确认：

- 是否能从 `docs/README.md` 找到本次变更对应文档
- 文档是否写明了可执行的验证命令
- 文档是否包含明确日期
- 术语与目录命名是否一致
