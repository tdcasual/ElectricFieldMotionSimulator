# Electric Field Motion Simulator

交互式电磁场模拟器。当前主线为 Vue 3 + TypeScript 的 V3 runtime（硬切完成）。

## 快速启动

1. `npm install`
2. `npm run dev:frontend`
3. 打开终端输出地址（默认 `http://localhost:5173`）

构建产物目录：`frontend/dist`。  
部署前请执行：`npm run build:frontend`。

## 运行环境

- Node.js: `24.x` / `25.x`（建议本地使用 `24.x`）
- npm: `10+`
- 可通过 `.nvmrc` 使用 `nvm use`

## V3 场景协议（硬约束）

- 运行时只接受 `version: "3.0"` 场景。
- 不提供运行时兼容迁移路径（不再支持旧版本自动兼容）。
- 场景结构基线：`version/revision/running/timeStep/viewport/selectedObjectId/objects`
- 示例文件：
  - `example-scene.json`
  - `frontend/public/scenes/embed-empty.json`
  - `frontend/public/scenes/material-mock-particle.json`

## 常用命令

- `npm run dev:frontend`: 本地开发
- `npm run build:frontend`: 构建前端
- `npm run test:frontend`: 运行 V3 Vitest
- `npm run test:e2e`: 运行 V3 Playwright 关键路径
- `npm run quality:all`: 运行完整质量门禁

## 文档入口

- 统一索引：`docs/README.md`
- 快速开始：`QUICKSTART.md`
- 当前架构：`docs/migration/current-vue-architecture.md`
- 场景版本策略：`docs/migration/scene-compatibility-policy.md`
- V3 硬切设计：`docs/plans/2026-03-03-v3-hardcut-no-compatibility-design.md`
- 历史归档：`docs/history/README.md`
