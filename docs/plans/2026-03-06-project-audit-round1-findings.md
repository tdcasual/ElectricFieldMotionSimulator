# 项目首轮审计结果（Round 1）

Date: 2026-03-06  
Status: P1 已修复，P2 已修复或缓解

## 1. 本轮审计范围

本轮先执行以下两类审计：

1. **自动化基线审计**：`node --test test/e2e_url_consistency.test.js`、`npm test`、`npm run test:frontend`、`npm run test:e2e`
2. **高风险区域人工审计**：
   - A 应用壳层与导航编排区
   - C 对象创建、工具栏与预设区
   - D 属性编辑、变量与几何双轨区
   - E 运行控制与模式切换区
   - F 场景 IO / 嵌入 / 验收链路区
   - H 视觉样式、主题与可访问性区

## 2. 本轮验证证据

### 2.1 自动化结果（修复后复验）

- `node --test test/e2e_url_consistency.test.js`：通过（2/2）
- `npm test`：通过（133/133）
- `npm run test:frontend`：通过（182/182）
- `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e`：通过（51 passed，37 skipped，0 failed）

### 2.2 E2E 根因与修复证据

本轮最先修复的是验收链路失真问题。根因与修复证据如下：

1. **旧问题根因**
   - `frontend/playwright.config.ts` 曾将 `baseURL` / `webServer` 固定到 `127.0.0.1:5173`
   - Playwright 曾启用 `reuseExistingServer: true`
   - 多个 E2E spec 直接硬编码 `localhost:5173` / `127.0.0.1:5173`
   - 本机 `5173` 在审计时实际被其它 Vite 应用占用，导致 E2E 曾跑到错误页面
2. **已落地修复**
   - `frontend/playwright.config.ts` 改为通过 `PLAYWRIGHT_VITE_PORT` 注入端口
   - `webServer` 启用 `--strictPort`
   - `reuseExistingServer` 改为 `false`
   - 全部相关 spec 改为 `page.goto('/')` 或相对路径
   - 新增 `test/e2e_url_consistency.test.js` 作为回归保护，阻止未来再次硬编码地址
3. **修复后结论**
   - 当前 E2E 已不再依赖共享默认端口
   - 本轮全量 E2E 已在独立端口 `4499` 上完成复验
   - 浏览器关键路径门禁恢复为可信状态

### 2.3 人工审计执行方式

为绕开共享端口污染，本轮人工审计和 E2E 回归均使用独立端口运行项目，并在桌面与手机视口下复核关键路径。

人工审计中使用到的代表性截图：

- 桌面首页：`.playwright-cli/page-2026-03-06T15-36-00-697Z.png`
- 桌面创建粒子后：`.playwright-cli/page-2026-03-06T15-37-00-899Z.png`
- 手机首页：`.playwright-cli/page-2026-03-06T15-37-36-584Z.png`
- 手机添加面板：`.playwright-cli/page-2026-03-06T15-38-12-788Z.png`
- 手机场景参数面板：`.playwright-cli/page-2026-03-06T15-39-30-637Z.png`
- 手机更多面板：`.playwright-cli/page-2026-03-06T15-40-12-139Z.png`

## 3. 首轮问题清单（修复后状态）

### Finding 1 — P1：E2E 验收链路与端口环境强耦合，测试结果曾不可信

**状态**

- 已修复

**区域**

- F 场景 IO / 嵌入 / 验收链路区
- H 发布与回归验证支撑区

**类型**

- 冲突：环境冲突、文档/测试约定冲突
- Bug：测试基建 Bug

**修复动作**

- Playwright 配置从固定 `5173` 改为环境变量端口
- 禁止静默复用外部已有服务
- 所有 E2E 导航地址统一改为相对路径
- 新增 Node 守卫测试拦截地址硬编码回归

**验证**

- `node --test test/e2e_url_consistency.test.js`：通过（2/2）
- `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e`：通过（51 passed，37 skipped，0 failed）

**结论**

- 本轮最关键的验收阻塞项已解除，E2E 结果重新具备可信度。

---

### Finding 2 — P1：手机端“添加 -> 选中 -> 编辑”主链路断裂，新增对象不会进入可编辑态

**状态**

- 已修复

**区域**

- A 应用壳层与导航编排区
- C 对象创建、工具栏与预设区
- D 属性编辑区

**类型**

- 冲突：状态冲突、流程冲突
- UI 不合理：主路径链路中断

**修复动作**

- `frontend/src/runtime/simulatorRuntime.ts` 中对象创建后立即设置选中态
- `js/interactions/DragDropManager.js` 中拖放创建路径也同步设置选中态
- `frontend/src/modes/usePhoneSheets.ts` 在手机 `add` sheet 检测到新选中对象后自动切换到 `selected` sheet
- `frontend/src/modes/useAppActions.ts` 不再在创建后粗暴关闭全部 sheet

**验证**

- `npm test`：通过，其中包含创建后自动选中的 Node 回归测试
- `npm run test:frontend`：通过，其中包含 `simulator-runtime` 与 `use-phone-sheets` 相关用例
- `PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e`：通过，手机主链路相关用例通过

**结论**

- 手机端主路径已恢复为“添加后可直接进入编辑”，不再要求用户回画布二次寻找对象。

---

### Finding 3 — P2：手机顶部状态沟通能力不足，关键模式说明被压缩且局部面板里缺失解释

**状态**

- 已修复

**区域**

- A 应用壳层与导航编排区
- E 运行控制与模式切换区
- H 视觉与可访问性区

**类型**

- UI 不合理：信息层级与解释位置冲突

**修复动作**

- `frontend/src/components/HeaderStatusAndSettings.vue` 补充更短、更清晰的手机 demo mode 状态文案
- `frontend/src/components/SceneSettingsControls.vue` 增加面板内说明，解释 demo mode 下比例尺与重力为何锁定
- `styles/main.css` 增加说明文案样式支持

**验证**

- `npm run test:frontend`：通过，其中包含 `header-status-and-settings` 相关用例
- 手机视口人工复核：顶部状态与面板内说明可同时支撑理解，不再只依赖被压缩的小字

**结论**

- 模式说明已从“只在顶部弱提示”调整为“顶部概览 + 面板内本地解释”的组合方式。

---

### Finding 4 — P2：手机端危险操作层级偏平，重置与清空的误触成本控制不足

**状态**

- 已缓解

**区域**

- A 应用壳层与导航编排区
- E 运行控制区
- H 视觉层级与交互安全区

**类型**

- UI 不合理：危险操作与常规操作主次不清

**修复动作**

- `frontend/src/modes/useAppActions.ts` 为手机端 `resetScene` 增加确认步骤
- `frontend/src/components/PhoneMoreSheet.vue` 将 `清空场景` 拆到独立危险动作分区
- 保留原有清空确认，叠加入口分组区分，降低误触成本

**验证**

- `npm run test:frontend`：通过，其中包含 `use-app-actions` 与 `phone-more-sheet` 相关用例
- 手机视口人工复核：危险动作与常规操作已有明显分区，重置误触会先被确认拦截

**结论**

- 该问题已明显缓解，但若后续继续优化手机端防误触，可再评估是否需要把高风险动作从高频区域继续下沉。

---

### Finding 5 — P2：桌面工具栏的创建语义不够自解释，按钮看起来可点击但单击默认并不创建

**状态**

- 已缓解

**区域**

- C 对象创建、工具栏与预设区
- H 可发现性与交互语义区

**类型**

- UI 不合理：入口语义不清晰

**修复动作**

- `frontend/src/components/DesktopToolbarSidebar.vue` 增加桌面创建提示，明确“单击放置、双击居中创建”的语义
- `styles/main.css` 增加提示样式，提升提示可见性

**验证**

- `npm run test:frontend`：通过，其中包含 `desktop-toolbar-sidebar` 相关用例
- 桌面视口人工复核：工具栏旁已具备即时使用提示，首次理解成本下降

**结论**

- 当前问题已从“入口语义不明”降低为“交互需要阅读提示”，可发现性显著改善。

## 4. 首轮审计结论

### 已确认并关闭的高优先级问题

1. **P1：E2E 验收链路失真** —— 已修复，浏览器门禁恢复可信
2. **P1：手机新增对象不进入可编辑态** —— 已修复，主路径恢复

### 已确认并完成整改的中优先级问题

1. **P2：手机模式说明沟通不足** —— 已修复
2. **P2：手机危险操作层级偏平** —— 已缓解
3. **P2：桌面工具栏创建语义不够直观** —— 已缓解

## 5. 下一轮建议

下一轮不必继续停留在本批 P1/P2 修复，可转向以下方向：

1. **回归稳态化**：把 `PLAYWRIGHT_VITE_PORT` 用法补进团队测试说明，减少本地误用
2. **手机防误触继续收口**：评估是否把高风险动作进一步下沉或合并进更低频入口
3. **桌面新手引导增强**：如需要，可继续补首屏轻提示或首次交互引导
4. **继续扩审 P3 区域**：变量/Markdown/嵌入宿主更复杂联动路径可继续做第二轮审计
