# 发布前回归清单

日期：2026-03-08
状态：当前主线

## A. 主路径功能

- [ ] 创建对象、选中对象、打开属性面板正常
- [ ] 播放 / 暂停 / 重置正常
- [ ] demo mode 进入 / 退出后 authoring 状态恢复正常
- [ ] 变量表、题板、property drawer 的返回链正确

## B. IO / Embed / Host

- [ ] 保存、加载、导入、导出正常
- [ ] 非法场景 payload 在 store / embed / host 上都有明确错误细节
- [ ] embed `sceneData` / `sceneUrl` / `materialId` 三类来源行为一致
- [ ] host `loadScene` 失败时返回 `validation` code 和细节文案

## C. 手机端与响应式

- [ ] `phone-chromium` E2E 通过
- [ ] 触控目标 `>= 44px`
- [ ] safe-area 下 header / nav / drawer 不越界
- [ ] markdown / variables / scene / property 的 backdrop 关闭后能恢复来源上下文
- [ ] orientation 切换后无悬空 sheet / drawer 状态

## D. 性能基线

- [ ] `npm run profile:high-emission`
- [ ] `npm run profile:expressions`
- [ ] `npm run profile:browser-render`
- [ ] `npm run profile:browser-expressions`
- [ ] 四类 profile 均输出统一 `schemaVersion/reportType/runtime/generatedAt/config/profiles/summaryRows`
- [ ] 无明显异常的 `p95/max/longTask/heap peak` 退化

## E. 文档同步

- [ ] `TESTING-GUIDE.md` 已包含本次测试 / 门禁变化
- [ ] `docs/README.md` 可以导航到新增主线文档
- [ ] 移动端交互规则更新时已同步 `docs/plans/2026-03-08-mobile-interaction-guidelines.md`
- [ ] 性能治理口径更新时已同步 `docs/plans/2026-03-08-performance-baseline-governance.md`
