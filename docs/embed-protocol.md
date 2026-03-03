# Embed Protocol (iframe + SDK)

Date: 2026-03-03

This document defines the V3 host/viewer messaging contract.

## 1. Transport

- Transport: browser `postMessage`.
- Host -> Viewer commands:
  - `source: "electric-field-host"`
  - `type: "command"`
- Viewer -> Host events:
  - `source: "electric-field-sim"`
  - `type: "<event-name>"`
- `targetOrigin="*"` is dev-only for local debug.
- Production integrations must pin explicit origin.
- `embed.js` rejects wildcard origin unless `allowDevWildcardTargetOrigin=true`.
- If `targetOrigin` is omitted, `embed.js` derives from `viewerPath`; if derivation fails, `inject()` throws.

## 2. Host -> Viewer Command Envelope

```json
{
  "source": "electric-field-host",
  "type": "command",
  "id": "req-123",
  "command": "play",
  "payload": {}
}
```

Fields:
- `id` optional, echoed in `command-result`.
- `command` required, one of:
  - `play`
  - `pause`
  - `togglePlay`
  - `reset`
  - `loadScene`
- `payload` command-specific:
  - `loadScene`: scene object, or `{ "sceneData": <scene> }`

## 3. Viewer -> Host Events

### 3.1 `ready`

Emitted after bootstrap success.

```json
{
  "source": "electric-field-sim",
  "type": "ready",
  "payload": {
    "mode": "view",
    "viewMode": true,
    "running": false
  }
}
```

### 3.2 `error`

Emitted when bootstrap fails.

```json
{
  "source": "electric-field-sim",
  "type": "error",
  "payload": {
    "code": "validation",
    "message": "Invalid scene payload"
  }
}
```

### 3.3 `command-result`

Emitted after each accepted command.

```json
{
  "source": "electric-field-sim",
  "type": "command-result",
  "payload": {
    "id": "req-123",
    "command": "loadScene",
    "ok": false,
    "code": "validation",
    "message": "Scene payload was rejected."
  }
}
```

## 4. Error Codes

Current known codes:
- `network`
- `parse`
- `validation`
- `runtime`
- `invalid-command`
- `timeout`

## 5. SDK Mapping (`embed.js`)

`ElectricFieldApp` public methods:
- `inject(target)`
- `destroy()`
- `play()`
- `pause()`
- `togglePlay()`
- `reset()`
- `loadScene(sceneData)`

Callbacks:
- `onReady(payload)`
- `onError(payload)`
- `onCommandResult(payload)`

Security options:
- `targetOrigin`
- `allowDevWildcardTargetOrigin` (default `false`)

## 6. Integration Coverage

Validated by:
- `frontend/e2e/v3-embed.spec.ts`
- `frontend/test/v3-infrastructure-adapters.test.ts`
