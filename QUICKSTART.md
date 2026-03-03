# 快速开始指南（V3 硬切）

## 1. 环境准备

- Node.js: `24.x` / `25.x`
- npm: `10+`

推荐：

```bash
nvm use
```

## 2. 本地开发

```bash
npm install
npm run dev:frontend
```

打开终端输出地址（默认 `http://localhost:5173`）。

注意：

- 不要直接用静态服务器打开仓库根目录，`.vue`/`main.ts` 需要 Vite 编译。
- 若要本地静态验证，请先 `npm run build:frontend`，再服务 `frontend/dist`。

## 3. 构建与部署产物

```bash
npm run build:frontend
```

输出目录：`frontend/dist`

构建后关键入口：

- `frontend/dist/index.html`（编辑器）
- `frontend/dist/viewer.html`（容器页）
- `frontend/dist/embed.js`（嵌入 SDK）

## 4. 核心操作路径

1. 点击工具栏创建对象（电场/磁场/粒子）。
2. 点击 `Play/Pause` 控制仿真。
3. 选中对象后调整属性。
4. 使用 `Save/Load`（本地存储）或 `Import/Export`（文件）管理场景。

## 5. 场景格式与兼容策略

当前运行时只接受 `version: "3.0"` 场景。

最小结构示例：

```json
{
  "version": "3.0",
  "revision": 0,
  "running": false,
  "timeStep": 0.016,
  "viewport": { "width": 1280, "height": 720 },
  "selectedObjectId": null,
  "objects": []
}
```

说明：

- 不再提供旧版本场景的运行时兼容与迁移提示。
- 非 `3.0` 载荷会被拒绝。
- 可直接使用仓库示例：`example-scene.json`。

## 6. 嵌入模式（Viewer + SDK）

协议文档：`docs/embed-protocol.md`

`iframe` 示例：

- `viewer.html?mode=view&sceneUrl=https://example.com/scene.json`
- `viewer.html?mode=view&materialId=mock-particle`

JS SDK 示例：

```js
const app = new ElectricFieldApp({ mode: 'view', sceneUrl: 'https://example.com/scene.json' });
app.inject('#sim-container');
await app.play();
await app.pause();
await app.reset();
await app.loadScene({
  version: '3.0',
  revision: 0,
  running: false,
  timeStep: 0.016,
  viewport: { width: 960, height: 540 },
  selectedObjectId: null,
  objects: []
});
```

## 7. 验证命令

```bash
npm run lint:frontend
npm run typecheck:frontend
npm run test:frontend
npm run test:e2e
npm run quality:all
```
