# Embed Protocol (iframe + SDK)

Date: 2026-02-27

This document defines the host/viewer messaging contract for the phase-1 embed runtime.

## 1. Transport

- Transport: browser `postMessage`.
- Host -> Viewer commands:
  - `source: "electric-field-host"`
  - `type: "command"`
- Viewer -> Host events:
  - `source: "electric-field-sim"`
  - `type: "<event-name>"`
- Current implementation sends with `targetOrigin="*"`. For production hardening, restrict origin in host and viewer.

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

Emitted after each accepted command message.

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

Fields:
- `id`: echoed request id or `null`.
- `command`: command name.
- `ok`: command success boolean.
- `code`/`message`: included only when `ok=false`.

## 4. Error Codes

Current known codes:
- `network`: remote scene fetch failure.
- `parse`: inline scene parse failure.
- `validation`: scene schema/runtime validation failure.
- `runtime`: bootstrap/runtime exception.
- `invalid-command`: unsupported command name.
- `timeout`: SDK-side timeout waiting for `command-result`.

## 4.1 Local Mock `materialId` (current phase)

Current phase ships a local mock material registry in:
- `frontend/src/embed/materialMockRegistry.ts`

Built-in ids:
- `mock-empty` -> `/scenes/embed-empty.json`
- `mock-particle` -> `/scenes/material-mock-particle.json`

This is a temporary backend-free adapter. Later phases can replace it with a remote material service while keeping the same `materialId` entry point.

## 5. SDK Mapping (`embed.js`)

`ElectricFieldApp` public methods:
- `inject(target)`
- `destroy()`
- `play()` -> command `play`
- `pause()` -> command `pause`
- `togglePlay()` -> command `togglePlay`
- `reset()` -> command `reset`
- `loadScene(sceneData)` -> command `loadScene`

Callbacks:
- `onReady(payload)`
- `onError(payload)`
- `onCommandResult(payload)`

## 6. Host Usage Example

```html
<script src="./embed.js"></script>
<div id="sim"></div>
<script>
  const app = new ElectricFieldApp({
    mode: 'view',
    sceneUrl: './scene.json',
    onReady: (payload) => console.log('ready', payload),
    onError: (payload) => console.error('error', payload),
    onCommandResult: (payload) => console.log('command-result', payload)
  });
  app.inject('#sim');
  app.play();
</script>
```

## 7. Integration Coverage

The protocol path is validated by:
- `frontend/e2e/embed-protocol.spec.ts`
- `frontend/test/host-bridge.test.ts`
