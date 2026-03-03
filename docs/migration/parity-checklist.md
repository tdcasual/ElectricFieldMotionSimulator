# Core-Path Parity Checklist

Date: 2026-03-03  
Scope: V3 硬切后核心路径能力验收（不再保留旧运行时兼容目标）

| Flow | Old App | New App | Status | Evidence |
|---|---|---|---|---|
| Create object | yes | yes | PASS | `frontend/e2e/v3-core.spec.ts` |
| Edit properties | yes | yes | PASS | `frontend/test/v3-simulator-application.test.ts` |
| Play/Pause | yes | yes | PASS | `frontend/e2e/v3-core.spec.ts` |
| Import/Export | yes | yes | PASS | `frontend/e2e/v3-core.spec.ts` |
| Embed command roundtrip | yes | yes | PASS | `frontend/e2e/v3-embed.spec.ts` |
| Command transaction rollback | yes | yes | PASS | `frontend/test/v3-command-bus.test.ts` |

## Notes

- `PASS` 表示当前 V3 自动化测试已覆盖并通过。
- 本清单只针对 V3 主线，不再追踪旧版本兼容行为。
- 若核心路径改动，需重新执行 `npm run quality:all` 并更新本表。
