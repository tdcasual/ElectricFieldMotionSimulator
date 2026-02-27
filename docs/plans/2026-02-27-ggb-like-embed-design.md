# GGB-like Embed and Deploy Design

Date: 2026-02-27  
Status: Validated with stakeholder

## 1. Background and Goal

The current simulator supports full interactive editing in a Vue app and can export scene JSON files. The project now needs to support deployment and embedding modes that feel close to GeoGebra (GGB):

1. iframe embedding mode
2. JavaScript SDK embedding mode
3. offline/self-host deploy package mode

The core objective is to provide a unified runtime behavior across all modes so the same scene payload behaves consistently regardless of host platform.

## 2. Scope and Non-goals

In scope:
- Introduce a reusable viewer entry that can run in `view` mode (minimal controls).
- Add a parameter protocol compatible with GGB-style usage patterns.
- Add a deploy/export package workflow that produces static-hostable artifacts.
- Keep scene schema compatibility (`version/settings/objects`) and existing editor behavior.

Out of scope for phase 1:
- Material management backend (material_id storage, permissions, versioning).
- Full parity with all GGB APIs.
- Multi-tenant content platform features.

## 3. Current State Assessment

Strengths already in place:
- Build pipeline and static artifact generation already work.
- Runtime has clear boundaries (`store -> simulatorRuntime -> engine core`).
- Scene serialization/deserialization is established and portable.

Current gaps blocking GGB-like embedding:
- Export currently outputs scene JSON only, not deployable container pages.
- Runtime and renderer still rely on fixed DOM ids, making multi-instance embedding hard.
- Production artifact currently uses absolute asset URLs (`/assets/...`), risky for subpath hosting.
- No unified public embed API for host-side lifecycle and error handling.

## 4. Target Architecture

Adopt a three-layer architecture with shared core:

1. `viewer-core`
- Reuse existing simulation runtime/engine.
- Support `mode=view` and `mode=edit` behavior gates.
- Provide stable programmatic control points.

2. `embed-sdk`
- Expose host-friendly API (inject/load/play/pause/destroy).
- Normalize inputs from URL params and JS config.
- Emit lifecycle events (`ready`, `load`, `error`, `statechange`).

3. `export-packager`
- Produce deploy-ready static bundle.
- Include viewer page, scene payload, assets, and usage docs.
- Work on common static hosts (Vercel, Netlify, Cloudflare Pages, self-host).

All outward-facing modes map to the same runtime core to avoid behavior drift.

## 5. Mode Mapping (GGB-like)

### 5.1 iframe mode
- URL example: `viewer.html?scene=https://example.com/scene.json&mode=view`
- Host controls via iframe URL and optional postMessage bridge.

### 5.2 JavaScript embed mode
- API style: `new ElectricFieldApp(config).inject(container)`
- Supports inline scene data, remote URL scene, and later `materialId`.

### 5.3 Offline/self-host mode
- Deploy the exported static package directly.
- Works with no application server dependency.

## 6. Parameter Protocol and Compatibility

Canonical parameters:
- `sceneUrl`: remote scene JSON URL
- `sceneData`: inline scene object/string
- `materialId`: reserved for backend-backed content
- `mode`: `view | edit`
- `toolbar`: boolean
- `autoplay`: boolean
- `theme`: string
- `locale`: string
- `width` / `height`: container sizing hints

Load precedence:
`sceneData > sceneUrl > materialId > defaultScene`

Compatibility aliases (for easier migration from GGB habits):
- `filename` -> `sceneUrl`
- `id` / `material_id` -> `materialId`

## 7. Component Design for Phase 1

### 7.1 `EmbedBootstrap`
Responsibilities:
- Parse URL and SDK options.
- Normalize aliases and defaults.
- Output validated runtime load config.

### 7.2 `SceneSourceResolver`
Responsibilities:
- Resolve scene source by precedence.
- Fetch remote JSON when needed.
- Return validated scene payload or typed error.

### 7.3 `ViewerShell`
Responsibilities:
- Mount simulator runtime in `view` mode.
- Hide authoring UI in container usage.
- Keep minimal playback controls.

### 7.4 `EmbedBridge`
Responsibilities:
- Bridge viewer lifecycle to host callbacks.
- Provide command surface (`play`, `pause`, `reset`, `loadScene`).
- Provide explicit error events for host fallback logic.

## 8. Data Flow

1. Host provides config (URL params or SDK config).
2. `EmbedBootstrap` normalizes to canonical config.
3. `SceneSourceResolver` loads source data.
4. Scene payload validated against schema.
5. `ViewerShell` mounts runtime and loads scene.
6. `EmbedBridge` emits `ready/load/error` to host.
7. Host optionally issues control commands.

This keeps source-of-truth logic centralized and testable.

## 9. Error Handling and UX States

Error classes:
- `LOAD_ERROR`: network/404/CORS issues.
- `VALIDATION_ERROR`: schema mismatch.
- `RUNTIME_ERROR`: mount/render/update failure.

Requirements:
- Never blank-screen silently.
- Render user-visible error state in viewer shell.
- Emit structured error event for host integration.
- Keep host page stable even when scene load fails.

## 10. Security and Trust Boundaries

- Treat all external scene inputs as untrusted.
- Validate all inputs before calling runtime loaders.
- Do not allow arbitrary script execution through embed parameters.
- Restrict expression evaluation to existing validated scene semantics.
- Document CORS requirements for `sceneUrl` mode.

## 11. Testing Strategy

Unit tests:
- Parameter precedence and alias mapping.
- Error mapping for load/validation failures.

Integration tests:
- Viewer `mode=view` UI contract.
- SDK command bridge and event emissions.

E2E tests:
- iframe URL loading path.
- SDK inject path.
- exported package static-host smoke test.
- subpath deploy path for asset URL safety.

## 12. Risks and Mitigations

1. Multi-instance conflicts from fixed DOM ids
- Phase 1: document single-instance assumption.
- Phase 2: migrate to container-scoped queries.

2. Absolute asset path breakage under subpath hosting
- Add configurable build base and subpath tests.

3. CORS failures for remote scenes
- Document requirements and add clear fallback errors.

4. Runtime/API divergence between modes
- Force all modes through shared `viewer-core`.

## 13. Delivery Phases

### Phase 1 (accepted now)
- iframe + sceneUrl / sceneData
- JS SDK inject with core lifecycle events
- deployable offline/static export package
- no backend material registry

### Phase 2
- `materialId` backend resolver
- content versioning and permissions

### Phase 3
- richer SDK APIs and postMessage parity expansion
- multi-instance robustness and deeper host integrations

## 14. Phase 1 Acceptance Criteria

1. `viewer.html` can load scene by URL and inline payload.
2. SDK can inject into a container and emit ready/error.
3. Export package runs after direct static deployment.
4. Existing editor entry remains unchanged and non-regressive.
5. Scene load failures show explicit UI + emitted errors.

## 15. Immediate Next Step

Create a detailed implementation plan for phase 1, including:
- file-level changes
- test-first milestones
- rollout and rollback checkpoints
