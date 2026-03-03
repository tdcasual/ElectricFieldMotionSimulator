# 文档系统规范（V3 主线）

最后更新：2026-03-03

## 目标

建立最小且可执行的文档系统，确保：

- 单一入口：所有有效文档可由 `docs/README.md` 导航
- 代码同步：行为变更必须同步更新文档
- 口径一致：不保留过期兼容路径与历史实施噪音
- 可验证：文档中的命令可直接执行

## 文档范围

### 根目录文档（入口）

- `README.md`
- `QUICKSTART.md`
- `TESTING-GUIDE.md`
- `CHANGELOG.md`

### `docs/` 主线文档（唯一工作面）

- `docs/migration/`：架构与场景协议
- `docs/release/`：发布检查与回滚预案
- `docs/embed-protocol.md`：嵌入协议
- `docs/device-extension-checklist.md`：扩展清单
- `docs/documentation-system.md`：治理规则

## 何时必须更新文档

1. 场景协议、命令协议、错误语义发生变化。
2. 测试门禁、CI 策略、运行环境策略发生变化。
3. 架构边界或模块职责发生变化。
4. 发布流程、回滚流程发生变化。

## 提交流程（文档门禁）

在宣告完成前，至少执行：

```bash
rg -n "docs/README.md|scene-compatibility-policy|embed-protocol|quality:all" README.md QUICKSTART.md TESTING-GUIDE.md docs/README.md
```

如涉及交互行为改动，至少运行一次：

```bash
npm run test:e2e -- --project=phone-chromium
```

## 评审清单

- `docs/README.md` 能找到本次变更对应文档。
- 文档中的命令在当前仓库可执行。
- 不包含已删除目录或废弃兼容路径引用。
- 文档日期与当前状态一致。
