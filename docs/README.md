# 项目文档中心

最后更新：2026-02-28

本页是项目文档统一入口。请优先从这里进入对应主题文档，避免在仓库中分散查找。

## 1) 入门与总览

- 项目总览：`README.md`
- 快速开始：`QUICKSTART.md`
- 测试指南：`TESTING-GUIDE.md`
- 变更日志：`CHANGELOG.md`

## 2) 当前主线文档

### 架构与迁移
- `docs/migration/current-vue-architecture.md`
- `docs/migration/parity-checklist.md`

### 进行中的设计与实施计划
- `docs/plans/`（按日期命名）

### 发布与运维
- `docs/release/frontend-rewrite-launch-checklist.md`
- `docs/release/frontend-rewrite-rollback-runbook.md`

## 3) 嵌入与扩展

- `docs/embed-protocol.md`
- `docs/device-extension-checklist.md`

## 4) 历史归档

- 归档入口：`docs/history/README.md`
- 历史计划：`docs/history/plans/`
- 历史手工页：`docs/history/manual-tests/`

## 5) 文档系统规范

- 文档治理与更新规则：`docs/documentation-system.md`

## 6) 推荐阅读顺序

1. `README.md`
2. `QUICKSTART.md`
3. `TESTING-GUIDE.md`
4. `docs/migration/current-vue-architecture.md`
5. `docs/plans/` 中最新日期文档

## 7) 维护约定

- 功能行为变更时，代码与文档同次提交更新。
- 文档新增优先放在 `docs/`，并在本页补充入口。
- 已完成且不再作为主线依据的计划，迁移到 `docs/history/`。
