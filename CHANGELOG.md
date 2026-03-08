# 变更日志 (CHANGELOG)

所有重要的项目变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [Unreleased] - 2026-03-08

### 修复 🐛
- **Playwright E2E 端口隔离与地址一致性修复**
  - 支持通过 `PLAYWRIGHT_VITE_PORT` 指定独立端口，避免误连其它本地 Vite 服务
  - 关闭 `reuseExistingServer`，并统一 E2E spec 使用相对路径
  - 新增 `test/e2e_url_consistency.test.js`，阻止硬编码 `5173` 回归
- **手机端“添加 -> 选中 -> 编辑”主链路修复**
  - 新建对象后自动进入选中态
  - 手机端从“添加”面板创建对象后自动过渡到“选中”面板
  - 修复创建后面板过早关闭、需要回画布重新选中的问题
- **场景导入 / embed / host 加载错误反馈细化**
  - 保留场景校验首条 issue，避免只显示通用失败文案
  - 导入失败、embed 启动失败、host `loadScene` 拒绝时统一返回具体错误原因
- **几何显示尺寸冲突从静默覆盖改为显式校验**
  - 同次提交多个显示尺寸字段时，统一推导共享缩放
  - 若多个字段推导出的缩放不一致，则直接返回冲突提示，避免后续字段被静默忽略
- **Authoring 抽屉切换恢复与草稿连续性修复**
  - 从属性抽屉临时切到变量表或题板后，关闭临时抽屉会恢复到上一个抽屉上下文
  - 同一对象下恢复属性抽屉时保留未提交草稿，避免手动重开时被 runtime 当前值覆盖
- **属性抽屉关闭后的上层抽屉恢复修复**
  - 当属性抽屉只是覆盖在 markdown / variables 之上时，关闭后会恢复到上一层抽屉
  - 删除当前对象导致属性抽屉关闭时，也会保留原本的 authoring 工作上下文
- **手机端 Sheet → Drawer 返回链修复**
  - 从“选中”面板进入属性抽屉、从“更多”面板进入变量表/题板时，会保留来源 Sheet 状态
  - 关闭抽屉后自动回到来源 Sheet，避免用户被打回空状态后重新找入口
- **桌面右键菜单残留收口修复**
  - 空白区域右键时会先收起旧上下文菜单，不再残留上一对象的操作入口
  - 开始新的拖拽 / 平移 / 选择前会先关闭旧菜单，避免画布反馈和菜单状态脱节
- **手写笔输入分类修复**
  - `pointerType === pen` 不再走 touch 的长按/双击开属性手势，恢复精确指针语义
  - 让 stylus 与手指在画布上的交互边界清晰分离，减少误触发属性面板
- **demo mode 退出后的编辑上下文恢复修复**
  - 进入 demo 前若已选中对象并打开属性抽屉，退出 demo 后会恢复原选中态与属性抽屉
  - 手机端 `selected` sheet 在 demo 临时清空 selection 后也会随退出流程自动恢复，避免重新找对象和入口
- **场景切换后的变量草稿上下文同步修复**
  - 加载本地场景、导入场景或切换预设成功后，变量表草稿会同步到当前 scene 的 variables
  - 保持变量表打开状态不被强制打断，同时避免旧场景变量残留到新场景编辑上下文
- **expression 运行态与变量/时间上下文同步修复**
  - 变量表更新后，带 expression 绑定的对象会按最新变量立即重算实际运行值
  - 时间推进时，依赖 `t` 的 expression 也会在 runtime 中同步刷新，避免预览与场景状态分叉
- **dynamic expression render-path 缓存优化**
  - 按对象类型缓存 expression schema，避免 repeated render 中重复解析同类 schema
  - 对纯数值 fallback 路径跳过重算与回写，减少大场景下无意义的绑定开销
- **场景 save / export / local load 校验边界统一**
  - 保存前拦截对象数量超限 payload，避免写入一份后续无法被统一链路接受的场景数据
  - 导出与本地加载复用同一条场景校验链，并把详细错误透传到 store 状态文案
- **轨迹隐藏与轨迹缓存释放语义对齐**
  - 全局关闭轨迹显示后停止后台追加轨迹点，避免“界面已隐藏但内存仍增长”
  - 单粒子关闭 `显示轨迹` 时立即清空历史轨迹缓存，降低长时运行后的残留占用
- **高频发射场景的动态粒子预算保护**
  - 电子枪与可编程发射器在运行时会尊重场景剩余对象预算，避免粒子数无限推高
  - 让高频发射下的运行态对象总量与 `5000` 的场景对象上限保持一致，减少卡顿与导出失败冲突

### 改进 🔧
- **高发射场景 profiling 基线命令**
  - 新增 `npm run profile:high-emission`，输出高频发射下不同轨迹策略的粒子峰值、轨迹点规模、步时分布与堆内存走势
  - 便于持续观察 G 区峰值内存 / GC 抖动趋势，而不把易波动的数值直接做成 CI 硬阈值
- **expression 并发绑定 profiling 基线命令**
  - 新增 `npm run profile:expressions`，输出大量 expression 绑定粒子的 parse 负载、refresh 耗时、总步时与堆内存走势
  - 让 D / G 交界的 expression 并发表现有可重复基线，便于后续比对变量绑定与时间绑定的回归差异
- **真实浏览器 render profiling 基线命令**
  - 新增 `npm run profile:browser-render`，在 Chromium 中采集高频发射场景的 `FPS / frame time / long-task` 基线
  - 让 D / G 交界的浏览器主线程卡顿有可重复观测入口，便于区分“模拟侧退化”与“渲染线程退化”
- **expression UI 浏览器 profiling 基线命令**
  - 新增 `npm run profile:browser-expressions`，在 Chromium 中采集属性抽屉 / 变量表 / expression hint 联动场景的 `FPS / frame time / long-task` 基线
  - 让 D / G 交界的 UI 联动卡顿可与纯模拟侧退化分开观察，并记录抽屉恢复与 hint 变化行为
- **表达式字段预览与变量联动增强**
  - 属性抽屉中的 expression 字段新增即时求值预览与错误提示
  - 变量表更新后，属性抽屉会基于最新变量/时间上下文自动刷新表达式提示
- **手机端模式沟通与防误触增强**
  - 顶部状态条与场景参数面板补充演示模式说明
  - 手机端“回到起始态”增加确认
  - “清空场景”移入独立危险操作分区，降低误触风险
- **桌面端创建语义增强**
  - 组件库侧边栏增加“单击放置、双击居中创建”提示，降低首次使用理解成本
- **审计后第 1 周状态链收敛**
  - 新增 `phoneSheetStateMachine` 与 `demoAuthoringSession` helper，收敛 `sheet ↔ drawer ↔ selection ↔ demo mode` 的恢复链
  - 用例覆盖手机 `selected / more / property` 返回链与 demo mode 退出后的编辑上下文恢复
- **审计后第 2 周验证体系治理**
  - 抽取 `frontend/e2e/helpers/phoneFlows.ts` 与 `frontend/e2e/helpers/assertions.ts`，降低 phone E2E 对具体 UI 打开顺序的耦合
  - 新增 `scene-validation-contract`，锁定 `sceneIO -> sceneSourceResolver -> hostBridge -> bootstrap` 的统一 `validation` contract
- **审计后第 1 个月性能基线治理**
  - 新增统一 `profileReport` schema，让 4 类 profile 输出固定 `schemaVersion / reportType / runtime / config / profiles / summaryRows` 结构
  - 将 profile JSON 输出固定到 `stdout`、Summary 固定到 `stderr`，支持 `npm --silent run ... > file.json` 做历史留档
  - 新增发布前回归 checklist，把主链路、IO/embed、手机端与性能基线纳入同一发布口径

### 文档 📚
- 更新 `README.md`、`TESTING-GUIDE.md`、`docs/documentation-system.md`
- 补充真实浏览器 render profiling 命令与可调参数说明
- 补充 expression UI 浏览器 profiling 命令与可调参数说明
- 补充 Playwright 独立端口用法与端口冲突排障说明
- 新增并回填审计与整改文档：
  - `docs/plans/2026-03-06-project-audit-plan.md`
  - `docs/plans/2026-03-06-project-audit-round1-findings.md`
  - `docs/plans/2026-03-06-p1-p2-remediation-plan.md`
  - `docs/plans/2026-03-07-project-audit-round2-findings.md`
- 回填并新增审计后优化文档：
  - `docs/plans/2026-03-08-post-audit-optimization-roadmap.md`
  - `docs/plans/2026-03-08-project-audit-final-report.md`
  - `docs/plans/2026-03-08-performance-baseline-governance.md`
  - `docs/plans/2026-03-08-mobile-interaction-guidelines.md`
  - `docs/plans/2026-03-08-release-readiness-checklist.md`
- 更新 `docs/README.md`，为性能治理、移动端规范与发布清单建立可导航入口
- 更新 `TESTING-GUIDE.md`，补充 Playwright helper 分层、profile 输出结构与基线留档方式

## [1.2.0] - 2025-12-06

### 新增 ✨
- **深色/浅色主题支持**：完整的主题切换系统
  - 新增 `ThemeManager.js` 模块，提供完整的主题管理功能
  - 深色模式（默认）：VS Code风格配色，适合长时间使用
  - 浅色模式：Windows 10风格配置，高对比度设计
  - 一键切换按钮（🌙/☀️）在头部导航栏
  - 主题偏好自动保存到 localStorage
  - 首次加载时自动检测系统主题设置

- **Canvas元素主题适配**
  - GridRenderer：网格线颜色随主题变化
  - FieldVisualizer：电场箭头和磁场符号颜色主题感知
  - 粒子轨迹线条颜色优化

- **CSS主题变量系统**
  - 23+ CSS变量支持深色/浅色两套配置
  - 所有UI组件通过CSS变量继承主题
  - 平滑的主题切换过渡动画

- **主题测试工具**
  - `test-theme.html`：交互式主题测试页面
  - `THEME-GUIDE.md`：详细的主题系统使用文档
  - `test_theme_integration.py`：自动化集成测试脚本

### 改进 🔧
- **主程序集成**：main.js中添加ThemeManager初始化和事件绑定
- **渲染优化**：Canvas渲染器自动检测当前主题并使用相应颜色
- **用户体验**：主题切换时显示成功通知反馈

### 兼容性 ✅
- Chrome/Edge (所有现代版本)
- Firefox 31+
- Safari 9.1+
- Opera (所有现代版本)
- 需要支持 CSS Custom Properties 和 localStorage

### 文档 📚
- 新增 `THEME-GUIDE.md`：主题系统完整指南
  - ThemeManager API 文档
  - CSS主题变量对照表
  - 使用流程和最佳实践
  - 问题诊断指南

---

## [1.1.0] - 2025-12-05

### 新增 ✨
- **清空场景功能**：新增清空按钮（🗑️），可一键清空所有对象
  - 带确认对话框，防止误操作
  - 清空后显示成功通知
  - 保留场景设置

- **导出场景功能**：新增导出按钮（📤）
  - 将当前场景导出为JSON格式文件
  - 自动生成时间戳文件名
  - 包含所有对象配置和场景设置
  - 支持跨设备和分享

- **导入场景功能**：新增导入按钮（📥）
  - 从JSON文件导入场景配置
  - 自动验证文件格式和数据完整性
  - 显示导入对象数量统计
  - 友好的错误提示信息

- **场景数据验证**：新增 `Serializer.validateSceneData()` 方法
  - 验证version字段
  - 验证数组字段完整性
  - 返回详细错误信息

- **示例场景文件**：提供 `example-scene.json` 供测试使用
  - 包含2个电场
  - 包含1个磁场
  - 包含2个粒子（正负电荷各一）

### 改进 🔧
- **重置功能优化**：重置时同时刷新场强渲染层
- **场景加载增强**：`loadFromData()` 支持完整的对象反序列化
- **Serializer工具扩展**：
  - 新增 `exportToFile()` 方法
  - 新增 `importFromFile()` 方法
  - 新增 `validateSceneData()` 方法
  - 改进错误处理机制

### 文档 📚
- 新增 `README.md`：完整的项目文档
  - 功能特性说明
  - 详细使用指南
  - 场景文件格式规范
  - 物理常数参考
  - 故障排除指南

- 新增 `QUICKSTART.md`：快速开始指南
  - 新功能演示教程
  - 实际应用场景举例
  - 常见问题解答
  - 使用技巧分享

### 修复 🐛
- 修复场景加载后场强可视化未更新的问题
- 修复文件输入框未正确重置的问题

---

## [1.0.0] - 2025-12-05

### 初始发布 🎉

#### 核心功能
- **拖拽式界面**：从工具栏拖拽组件到画布
- **实时物理模拟**：基于RK4四阶龙格-库塔法
- **多种对象类型**：
  - 矩形均匀电场
  - 圆形均匀电场
  - 均匀磁场
  - 带电粒子

#### 物理引擎
- RK4数值积分器
- 完整的向量数学库
- 电场力、洛伦兹力、重力计算
- 边界弹性碰撞处理

#### 渲染系统
- 三层Canvas架构（背景/场/粒子）
- 网格渲染
- 场强矢量可视化
- 粒子轨迹绘制
- 能量信息HUD
- FPS性能监控
- 高DPI屏幕适配

#### 交互功能
- 对象拖拽移动
- 右键上下文菜单
- 动态属性面板
- 对象选择/复制/删除
- 键盘快捷键支持

#### 数据管理
- localStorage保存/加载
- 场景序列化/反序列化
- 预设场景（3个）

#### UI/UX
- 现代化深色主题
- 响应式布局
- 平滑动画效果
- 友好的通知系统

---

## 版本命名规范

遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范：

- **主版本号**：不兼容的API修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

## 图例

- ✨ 新增功能
- 🔧 改进优化
- 🐛 Bug修复
- 📚 文档更新
- 🎨 UI/样式改进
- ⚡ 性能优化
- 🔒 安全修复
- 🗑️ 移除功能

---

## 未来规划

### [1.2.0] - 计划中
- [ ] 半圆形电场
- [ ] 平行板电容器（边缘效应）
- [ ] 撤销/重做功能
- [ ] 多选对象操作
- [ ] 对象分组功能

### [1.3.0] - 计划中
- [ ] 动画录制导出
- [ ] 数据统计分析
- [ ] 图表可视化
- [ ] CSV数据导出

### [2.0.0] - 远期规划
- [ ] 3D可视化模式
- [ ] WebGL渲染引擎
- [ ] 更复杂的场类型
- [ ] 粒子间相互作用

---

**感谢使用！** 🙏

如有建议或发现问题，欢迎反馈。
