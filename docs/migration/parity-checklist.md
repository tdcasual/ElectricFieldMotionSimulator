# Core-Path Parity Checklist

Date: 2026-02-25  
Scope: Vue 3 主线能力验收（相对旧实现）

| Flow | Old App | New App | Status | Evidence |
|---|---|---|---|---|
| Create object | yes | yes | PASS | `frontend/e2e/core-path.spec.ts` |
| Edit properties | yes | yes | PASS | `frontend/test/property-drawer.test.ts` + runtime apply tests |
| Play/Pause | yes | yes | PASS | `frontend/test/app-shell.test.ts` |
| Import/Export | yes | yes | PASS | `frontend/e2e/core-path.spec.ts`（导入导出入口可达） |
| Demo mode | yes | yes | PASS | `frontend/test/simulator-store.test.ts` + e2e |

## Notes

- `PASS` 代表自动化验证已覆盖并通过。
- 若后续核心路径有功能性改动，需重新执行 `npm run quality:all` 并更新本表。
