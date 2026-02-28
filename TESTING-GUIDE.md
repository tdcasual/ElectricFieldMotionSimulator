# 测试指南（Vue3 主线）

## 环境要求

- Node.js 20+
- npm 10+

## 一键质量门禁

```bash
npm run quality:all
```

该命令会串行执行：

- `npm run lint:frontend`
- `npm run typecheck:frontend`
- `npm test`
- `npm run test:frontend`
- `npm run test:e2e`

## 分层测试说明

### 1) 引擎与核心逻辑（Node 测试）

```bash
npm test
```

覆盖物理引擎、对象注册、序列化、相切提示、主入口切换等核心逻辑。

### 2) Vue 组件与状态层（Vitest）

```bash
npm run test:frontend
```

覆盖 `App` 壳层、工具栏、属性抽屉、运行时桥接、`simulatorStore` 等 Vue 主链路。

### 3) 浏览器端关键路径（Playwright）

```bash
npm run test:e2e
```

覆盖创建对象、属性编辑、播放、场景 IO、演示模式等用户关键流程。

手机端专项回归（推荐在涉及触控改动时执行）：

```bash
npm run test:e2e -- --project=phone-chromium
```

## 手机端交互验收基线（2026-02-28）

以下条目作为当前手机端交互门禁：

- 底部导航按钮触控高度 `>= 44px`
- 手机面板（如“更多”）核心按钮触控高度 `>= 44px`
- 手机属性面板折叠按钮与输入控件高度 `>= 44px`
- 面板下滑关闭手势在“手指滑出 header 再抬起”场景依然生效

可用以下命令快速回归核心项：

```bash
npm run test:e2e -- --project=phone-chromium --grep "density|landscape|touch targets|swipe"
```

## 手工冒烟（推荐）

1. 启动：`npm run dev:frontend`
2. 访问终端提示地址（默认 `http://localhost:5173`）
3. 验证以下路径：
- 拖拽创建对象并移动
- 打开属性面板并修改参数
- 播放/暂停/重置模拟
- 保存、加载、导入、导出场景
- 演示模式切换与缩放

## 常见问题

### 页面空白（http-server 直开）

`.vue` 和 `main.ts` 需要 Vite 编译，不能直接用 `http-server` 打开源码目录。  
请使用：

- 开发：`npm run dev:frontend`
- 静态部署：`npm run build:frontend` 后再服务 `dist`

## 历史手工调试页

旧版手工调试页已归档到：

- `docs/history/manual-tests/`

这些页面用于历史回溯，不属于当前 CI 流程，不作为 Vue 主线验收标准。
