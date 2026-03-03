# 变更日志 (CHANGELOG)

所有重要的项目变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [Unreleased] - 2026-03-03

### 改进
- 执行 V3 主线硬清理（方案 A）：移除历史代码资产与历史计划归档。
- 仓库文档口径收敛为 V3-only：删除失效路径引用与过期兼容叙事。
- 文档入口改为最小可执行集合，仅保留当前架构、协议、运维和扩展清单。

### 移除
- 删除历史代码资产目录：`js/`、`test/`、`test_theme_integration.py`。
- 删除历史文档目录：`docs/history/`、`docs/plans/`。
- 删除过期主题文档：`THEME-GUIDE.md`、`THEME-IMPLEMENTATION-REPORT.md`、`THEME-QUICK-REFERENCE.md`、`THEME-SUMMARY.md`。
- 删除一次性硬清脚本：`scripts/v3-hardclean-no-compat.sh`。

---

## [2026-03-03] - V3 Runtime Baseline

### 基线
- 前端主线固定为 Vue 3 + TypeScript V3 runtime。
- 场景协议固定为 `version: "3.0"`。
- 质量门禁固定为：`lint:frontend`、`typecheck:frontend`、`test:frontend`、`test:e2e`。
