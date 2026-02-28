# ⚡ 电磁场粒子运动模拟器

这是一个可以“边拖边看”的电磁学小实验场。
你可以把电场、磁场和粒子放到画布里，实时观察轨迹、偏转和回旋运动。

如果你想快速体验：
- 🚀 运行 `npm install && npm run dev:frontend`，然后访问终端提示地址
- ℹ️ 开发态请使用 Vite；直接 `http-server` 打开根目录不会编译 `.vue` 文件
- 🚀 或者看更详细的启动说明：[`QUICKSTART.md`](QUICKSTART.md)

## ✨ 你可以做什么

- 🧲 拖拽添加对象：电场、磁场、粒子、装置
- ▶️ 实时播放物理过程：暂停、继续、重置
- 🎛️ 调整对象参数，马上看到运动变化
- 💾 保存、加载、导入、导出场景
- 🎯 在圆形边界附近获得相切提示和吸附（按住 `Alt/Option` 可临时关闭吸附）

## 🚀 上手只要 30 秒

1. 从左侧工具栏放置一个场和一个粒子
2. 点击播放按钮或按 `Space`
3. 拖动对象位置，观察轨迹变化
4. 右键对象（触屏用长按）打开属性面板继续微调

## ⌨️ 常用快捷键

- `Space`：播放 / 暂停
- `Delete`：删除选中对象
- `Ctrl+S`：保存场景
- `Ctrl+O`：加载场景

## 📚 想了解更多

- 📚 文档中心（统一入口）：[`docs/README.md`](docs/README.md)
- 🧭 文档系统规范：[`docs/documentation-system.md`](docs/documentation-system.md)
- 🧭 快速开始：[`QUICKSTART.md`](QUICKSTART.md)
- ✅ 测试与验证：[`TESTING-GUIDE.md`](TESTING-GUIDE.md)
- 📝 更新记录：[`CHANGELOG.md`](CHANGELOG.md)
- 🧪 示例场景：[`example-scene.json`](example-scene.json)

迁移与发布文档：
- 📌 前端对齐清单：[`docs/migration/parity-checklist.md`](docs/migration/parity-checklist.md)
- 🧱 当前架构：[`docs/migration/current-vue-architecture.md`](docs/migration/current-vue-architecture.md)
- 🧠 Vue 原生化设计：[`docs/plans/2026-02-25-vue-native-runtime-design.md`](docs/plans/2026-02-25-vue-native-runtime-design.md)
- 🛠️ Vue 原生化实施计划：[`docs/plans/2026-02-25-vue-native-runtime-implementation-plan.md`](docs/plans/2026-02-25-vue-native-runtime-implementation-plan.md)
- 🧹 测试与旧版清理计划：[`docs/plans/2026-02-25-vue-testing-and-legacy-cleanup-plan.md`](docs/plans/2026-02-25-vue-testing-and-legacy-cleanup-plan.md)
- 🗂️ 历史归档：[`docs/history/README.md`](docs/history/README.md)
- 🚦 上线检查：[`docs/release/frontend-rewrite-launch-checklist.md`](docs/release/frontend-rewrite-launch-checklist.md)
- 🧯 回滚预案：[`docs/release/frontend-rewrite-rollback-runbook.md`](docs/release/frontend-rewrite-rollback-runbook.md)

## 🎯 一句话总结

这是一个偏教学和演示友好的电磁场模拟器：
操作轻量，反馈直观，适合快速搭实验、讲思路、做课堂展示。
