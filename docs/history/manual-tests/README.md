# 历史手工调试页

最后更新：2026-02-25

本目录存放早期基于原生模块的手工调试页面。  
它们主要用于历史问题回溯，不属于当前 Vue3 主线验收。

## 包含页面

- `test-debug.html`
- `test-simple.html`
- `test-objects-drag.html`
- `test-new-objects.html`
- `test-theme.html`
- `test-capacitor.html`
- `test-capacitor-drag.html`

## 运行方式（仅历史调试）

1. 在仓库根目录启动静态服务器（例如 `http-server .`）。
2. 打开页面路径，例如 `http://localhost:8000/docs/history/manual-tests/test-debug.html`。

> 说明：页面内部模块路径已经调整为 `../../../js/*`，可在归档目录下独立运行。
