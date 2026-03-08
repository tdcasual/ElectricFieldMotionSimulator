# 项目审计总报告（Final）

Date: 2026-03-08  
Project: ElectricFieldMotionSimulator  
Conclusion: A-H 全区域审计完成；当前不存在未审计区域。

## 1. 审计目标

本次审计围绕三个核心目标展开：

1. 按区域完成 A-H 全覆盖审计，确保不存在“只修局部、不知全貌”的盲区。
2. 在代码、交互和真实浏览器行为三个层面寻找：
   - 区域间语义冲突
   - 明确可复现的 bug
   - UI / 交互不合理点
3. 对确认问题进行分级、修复、补测试、回归验证，并形成可追溯文档结论。

## 2. 审计范围与区域地图

- A. 应用壳层与导航编排区
- B. 画布视口与直接操作区
- C. 对象创建、工具栏与预设区
- D. 属性编辑、变量与 authoring 协同区
- E. 运行控制与模式切换区
- F. 场景 IO、导入导出、预设与嵌入区
- G. 引擎、物理正确性与性能稳定性区
- H. 视觉样式、主题与可访问性区

## 3. 审计方法

本轮采用“静态审计 + 定向测试 + 真实浏览器回归 + 文档归档”四层方式：

- 静态代码审计：检查关键状态流、模式切换、抽屉 / sheet / runtime 链路。
- 单元 / 组件测试：针对 store、runtime、交互组件补失败用例并回归。
- 真实浏览器验证：使用 Playwright 复核手机/桌面关键主链路与响应式边界。
- 覆盖矩阵归档：把 A-H 各区域的发现、修复和“无新增问题”结论统一写入审计文档。

## 4. 审计结果总览

### 4.1 总体结论

- A-H 八个区域已全部审计完成。
- 共关闭 19 项明确问题。
- 本轮新增并最终关闭的最后一项问题为：
  - Finding 19：demo mode 进出会丢失选中态与编辑上下文。
- 当前未发现新的未审计区域，也未发现仍未落地闭环的已知高优先级问题。

### 4.2 风险结论

- 高风险主链路（创建、编辑、播放、重置、导入导出、demo mode、手机 sheet / drawer 切换）已完成覆盖。
- 跨区域最容易出问题的链路已重点核验：
  - 手机 sheet ↔ drawer 返回链
  - property / variables / markdown 多抽屉上下文恢复链
  - demo mode 进出与编辑态恢复链
  - IO / embed / host 的统一校验反馈链
  - 大场景粒子 / expression / 轨迹的性能与观测基线

### 4.3 审计后结构化优化回填

审计完成后，项目没有停留在“问题已关闭”的状态，而是继续按路线图完成了三阶段结构化优化：

- 第 1 周：完成状态链收敛，引入 `phoneSheetStateMachine` 与 `demoAuthoringSession`，把 `sheet ↔ drawer ↔ selection ↔ demo mode` 的恢复逻辑从分散 watcher 收敛到显式 helper。
- 第 2 周：完成验证体系治理，抽取 phone Playwright helper，并新增 `scene-validation-contract`，让 `sceneIO / resolver / host / bootstrap` 的 `validation` code 与错误细节有统一 contract。
- 第 1 个月：完成性能基线治理与移动端规范沉淀，统一四类 profile 的输出 schema，补齐移动端交互规范和发布前 checklist。

因此，本报告的最终状态不只是“审计完成”，而是“审计问题已闭环，且后续治理基础设施已经落地”。

## 5. 分区域结论

### A. 应用壳层与导航编排区

- 已确认并关闭的代表问题：
  - 手机“添加 -> 选中 -> 编辑”主链路断裂
  - 手机状态说明不足
  - 手机危险操作层级过平
  - 属性抽屉关闭后不恢复来源上下文
  - 手机 selected / more sheet 进入 drawer 后关闭不返回来源
  - demo mode 退出后手机 selected 上下文不恢复
- 当前结论：已审计完成，导航编排不存在未审计空白。

### B. 画布视口与直接操作区

- 已确认并关闭的代表问题：
  - 桌面右键菜单 stale 残留
  - pen / stylus 被错误归入 touch 手势链
- 当前结论：已审计完成，直接操作与上下文菜单边界明确。

### C. 对象创建、工具栏与预设区

- 已确认并关闭 / 缓解的代表问题：
  - 创建语义不清晰
  - 手机创建后不自动进入可编辑态
- 本轮补审重点：
  - 桌面单击 / 双击创建语义
  - 手机 add -> selected 主链路
  - 预设加载后的对象数 / 状态同步
- 当前结论：已补审完成，未发现新增明确问题。

### D. 属性编辑、变量与 authoring 协同区

- 已确认并关闭的代表问题：
  - expression 预览与实际运行值脱节
  - 属性抽屉 / 变量表 / 题板之间上下文恢复不完整
  - 场景切换后变量草稿残留旧 scene
  - demo mode 退出后 property / selected 上下文丢失
- 当前结论：已审计完成，authoring 协同链已闭环。

### E. 运行控制与模式切换区

- 已确认并关闭的代表问题：
  - 手机 demo mode 信息表达不足
  - 重置 / 清空等高风险动作反馈与防误触不足
  - demo mode 退出后无法恢复原编辑上下文
- 当前结论：已补审完成，模式切换语义稳定。

### F. 场景 IO、导入导出、预设与嵌入区

- 已确认并关闭的代表问题：
  - 详细校验错误被通用文案吞掉
  - save / export / local load 与 import / embed 校验边界不一致
  - 场景切换后变量上下文脱节
- 当前结论：已审计完成，反馈链与边界语义已统一。

### G. 引擎、物理正确性与性能稳定性区

- 已确认并关闭的代表问题：
  - expression repeated render 重复扫 schema
  - 轨迹隐藏后仍累积缓存
  - 高频发射缺少粒子总量保护
  - 缺少高发射 / expression / browser render / browser expression profiling 基线
- 当前结论：已审计完成，性能风险已从“缺少边界与观测”转为“有边界、有基线、可持续监控”。

### H. 视觉样式、主题与可访问性区

- 已确认并关闭 / 缓解的代表问题：
  - 手机状态说明与高风险动作视觉层级不清
  - 桌面工具栏语义提示不足
- 本轮补审重点：
  - 手机触控目标 >= 44px
  - markdown / variables / more / scene 等面板的可达性与恢复链
  - landscape / safe-area / bottom-nav / backdrop 的视觉与可操作性边界
- 当前结论：已补审完成，未发现新的明确视觉 / 可访问性缺陷。

## 6. 关键新增问题（最后闭环项）

### Finding 19 — demo mode 上下文恢复缺陷

**问题**
- 进入 demo mode 前已选中的对象、已打开的属性抽屉、手机 selected sheet，在退出 demo 后会丢失。

**根因**
- runtime 的 demoSession 只保存场景 snapshot 和运行状态，没有保存 `selectedObjectId`。
- store 与 phone sheet 状态机也没有把“demo 临时清空 selection”视为可恢复上下文。

**修复**
- runtime 保存并恢复 `selectedObjectId`
- store 在 demo 前记住 property drawer 恢复意图，并在退出 demo 后自动恢复
- phone sheet 状态机新增 selected sheet 待恢复标记
- Playwright 与 Vitest 相关回归同步更新

**结论**
- 该问题已关闭，E / A / D 三个交界区域的模式切换链已补齐。

## 7. 交付物

本次审计形成的核心交付物包括：

- 审计方案：`docs/plans/2026-03-06-project-audit-plan.md`
- 首轮结果：`docs/plans/2026-03-06-project-audit-round1-findings.md`
- 第二轮结果与最终覆盖矩阵：`docs/plans/2026-03-07-project-audit-round2-findings.md`
- 剩余覆盖清零计划：`docs/plans/2026-03-08-remaining-audit-coverage-plan.md`
- 变更记录：`CHANGELOG.md`
- 审计后优化路线图：`docs/plans/2026-03-08-post-audit-optimization-roadmap.md`
- 性能治理规范：`docs/plans/2026-03-08-performance-baseline-governance.md`
- 移动端交互规范：`docs/plans/2026-03-08-mobile-interaction-guidelines.md`
- 发布前回归清单：`docs/plans/2026-03-08-release-readiness-checklist.md`

## 8. 最终验证证据

已完成以下验证：

- `npm test`：149/149
- `npm run test:frontend`：232/232
- `npm run typecheck:frontend`：通过
- `npm run lint:frontend`：通过
- `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e`：51 passed / 37 skipped
- `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- --project=phone-chromium --grep "density|landscape|touch targets|swipe|utility drawer|scene sheet"`：17 passed
- `node --test test/profile_report_contract.test.js test/high_emission_profile.test.js test/expression_binding_profile.test.js test/browser_render_profile.test.js test/browser_expression_ui_profile.test.js`：8 passed
- `npm --silent run profile:high-emission` / `profile:expressions` / `profile:browser-render` / `profile:browser-expressions`：均已验证输出统一 schema 且支持 JSON 落盘

说明：Playwright 中的 skipped 用例来自项目既有的 phone / tablet 条件分流设计，不代表失败；profile 脚本的 Summary 已固定输出到 `stderr`，JSON 固定输出到 `stdout`。

## 9. 最终结论

**本项目本轮代码审计已完成。**

- 审计区域：A-H 全覆盖
- 审计结论：不存在未审计区域
- 缺陷状态：本轮已关闭 19 项明确问题
- 当前建议：可以进入“发布前清单复核 / 提测 / 上线评估”阶段
- 当前门禁材料：测试指南、性能治理规范、移动端交互规范、发布前清单均已齐备
