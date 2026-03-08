# 移动端交互规范

日期：2026-03-08
状态：当前主线

## 目标

把当前已经通过测试守住的移动端行为，从“散落在测试里的隐式规则”升级为“明确、可复核、可执行的交互规范”。

## 适用范围

- `phone` 布局
- `tablet` 触控路径
- `phone more / scene / selected / property / markdown / variables` 各类 sheet / drawer
- orientation、safe-area、backdrop 与上下文恢复链

## 核心规范

### 1. 触控目标

- 主操作按钮、sheet header 动作、底部导航、关键表单控件高度应 `>= 44px`
- checkbox/开关行应保证整行可点，不要求用户精准命中小控件
- 移动端输入框字号应 `>= 16px`，避免系统自动放大

### 2. Safe-Area 与布局边界

- `header`、`bottom nav`、`sheet`、`property drawer` 不得越过安全区
- 横屏短高度场景下，scene/property/markdown/variables 面板必须从 header 下缘开始
- 面板关键按钮不得落入左/右安全区外侧

### 3. 上下文恢复

- `selected -> property -> close` 应回到 `selected`
- `more -> markdown -> close` 应回到 `more`
- `more -> variables -> close` 应回到 `more`
- backdrop 关闭 utility drawer 后，应恢复来源上下文，而不是留下悬空状态
- orientation 切换后，backdrop 与 sheet 状态必须仍然可恢复，不得出现“视觉打开但交互失效”

### 4. 手势与关闭行为

- scene sheet 下滑关闭在“手指滑出 header 再抬起”的路径上仍应生效
- 点击空白区域关闭面板后，tap chain 不得残留污染下一次单击/双击判断
- 快速切 sheet + backdrop 点击后，不能残留任何隐藏但仍拦截交互的 sheet 状态

### 5. 危险操作分区与反馈

- 破坏性操作应与普通操作分区显示，避免误触
- 关闭、重置、删除类操作必须有明确文案或视觉反馈
- 从 `more` 进入二级工具后，返回路径必须可预期，避免“用户不知道自己还在什么上下文里”

## 对应测试门禁

当前规范主要由以下回归路径守护：

- `frontend/e2e/touch-core-path.spec.ts`
- `frontend/e2e/helpers/phoneFlows.ts`
- `frontend/e2e/helpers/assertions.ts`
- `frontend/test/use-phone-sheets.test.ts`
- `frontend/test/app-shell.test.ts`

推荐命令：

```bash
PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- --project=phone-chromium
```

涉及触控目标 / 横屏 / safe-area / swipe 的快速回归：

```bash
PLAYWRIGHT_VITE_PORT=4499 npm run test:e2e -- --project=phone-chromium --grep "density|landscape|touch targets|swipe|utility drawer|scene sheet"
```

## 设计评审问题

在新增移动端交互前，至少回答：

- 该操作的主触控目标是否达到 `44px`
- 它在横屏和安全区下是否仍然可见、可点
- 关闭后应该回到哪个来源上下文
- backdrop、orientation、快速切换时是否会残留脏状态
- 危险动作是否与普通动作视觉分区清晰

## 结论

移动端规范的核心不是“补更多判例”，而是把可触达、可恢复、可理解这三件事稳定下来。只要新增交互会影响这三条，就必须同步更新测试与文档。
