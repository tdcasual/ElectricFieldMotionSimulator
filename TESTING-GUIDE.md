# 测试指南（V3 主线）

## 环境要求

- Node.js `24.x` 或 `25.x`（推荐 `24.x`）
- npm 10+
- 建议使用 `.nvmrc`：`nvm use`

说明：
- CI 在 Node `24` 和 `25` 上执行前端质量门禁。

## 一键质量门禁

```bash
npm run quality:all
```

该命令会串行执行：

- `npm run lint:frontend`
- `npm run typecheck:frontend`
- `npm run test:frontend`
- `npm run test:e2e`

## 分层测试说明

### 1) Vue 组件与状态层（Vitest）

```bash
npm run test:frontend
```

覆盖 V3 domain/application/interaction/infrastructure 边界和 UI 绑定合约。

### 2) 浏览器端关键路径（Playwright）

```bash
npm run test:e2e
```

默认会在 `127.0.0.1:4273` 启动前端服务。

端口冲突可临时改用：

```bash
E2E_PORT=4373 npm run test:e2e
```

手机端专项回归：

```bash
npm run test:e2e -- --project=phone-chromium
```

## 手工冒烟（推荐）

1. 启动：`npm run dev:frontend`
2. 访问终端提示地址（默认 `http://localhost:5173`）
3. 验证：创建对象、编辑属性、播放/暂停、导入/导出、嵌入模式。

## 常见问题

`.vue` 和 `main.ts` 需要 Vite 编译，不要直接用静态服务器打开源码目录。

- 开发：`npm run dev:frontend`
- 静态部署：`npm run build:frontend` 后服务 `frontend/dist`
