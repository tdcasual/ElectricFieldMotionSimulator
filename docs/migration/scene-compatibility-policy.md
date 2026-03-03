# Scene Compatibility Policy

Date: 2026-03-03

## Policy

1. Runtime only accepts scene payloads with `version: "2.0"`.
2. Any non-`2.0` payload must be rejected with explicit message: `仅支持 2.0 版本场景`.
3. Import/load failure messages should preserve specific validation errors; generic `导入失败` is fallback-only.

## Enforcement Points

- Engine validation: `js/utils/Serializer.js`
- Runtime gate: `frontend/src/runtime/simulatorRuntime.ts`
- Store status handling: `frontend/src/stores/simulatorStore.ts`
- Schema pre-check: `frontend/src/io/sceneSchema.ts`

## Test Coverage

- Node: `test/scene.test.js`
- Phone E2E: `frontend/e2e/touch-core-path.spec.ts` (legacy import policy assertion)
