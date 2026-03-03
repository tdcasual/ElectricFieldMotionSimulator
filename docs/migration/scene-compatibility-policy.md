# Scene Compatibility Policy

Date: 2026-03-03

## Policy

1. Runtime only accepts scene payloads with `version: "3.0"`.
2. Any non-`3.0` payload must be rejected with explicit message: `仅支持 3.0 版本场景。`.
3. Import/load failure messages should preserve specific validation errors; generic `导入失败` is fallback-only.

## Migration Stance

1. No runtime compatibility bridge for historical scene formats.
2. No official in-repo migration workflow is provided for older scene versions.
3. Teams that still hold historical data must convert it out-of-band before importing.

## Enforcement Points

- Schema gate: `frontend/src/io/sceneSchema.ts`
- Scene validation entry: `frontend/src/io/sceneIO.ts`
- Store import/load handling: `frontend/src/stores/simulatorStore.ts`
- Embed source validation: `frontend/src/embed/sceneSourceResolver.ts`

## Test Coverage

- Vitest: `frontend/test/v3-infrastructure-adapters.test.ts`
- Vitest: `frontend/test/v3-simulator-application.test.ts`
- E2E: `frontend/e2e/v3-core.spec.ts`
- E2E: `frontend/e2e/v3-embed.spec.ts`
