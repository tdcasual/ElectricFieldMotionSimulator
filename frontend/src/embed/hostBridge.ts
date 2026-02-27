type AnyRecord = Record<string, unknown>;

export type HostCommandName = 'play' | 'pause' | 'togglePlay' | 'reset' | 'loadScene';

export type HostCommandMessage = {
  source: 'electric-field-host';
  type: 'command';
  id?: string;
  command: HostCommandName;
  payload?: unknown;
};

export type HostCommandResult =
  | { ok: true }
  | { ok: false; code: 'invalid-command' | 'validation'; message: string };

export type HostCommandStore = {
  startRunning: () => void;
  stopRunning: () => void;
  toggleRunning: () => void;
  resetScene: () => void;
  loadSceneData: (data: Record<string, unknown>) => boolean;
};

function isRecord(value: unknown): value is AnyRecord {
  return !!value && typeof value === 'object';
}

function isCommandName(value: unknown): value is HostCommandName {
  return (
    value === 'play' ||
    value === 'pause' ||
    value === 'togglePlay' ||
    value === 'reset' ||
    value === 'loadScene'
  );
}

export function parseHostCommandMessage(input: unknown): HostCommandMessage | null {
  if (!isRecord(input)) return null;
  if (input.source !== 'electric-field-host') return null;
  if (input.type !== 'command') return null;
  if (!isCommandName(input.command)) return null;
  const id = typeof input.id === 'string' && input.id.trim().length > 0 ? input.id.trim() : undefined;
  return {
    source: 'electric-field-host',
    type: 'command',
    id,
    command: input.command,
    payload: input.payload
  };
}

function extractScenePayload(payload: unknown): Record<string, unknown> | null {
  if (isRecord(payload)) {
    if (isRecord(payload.sceneData)) return payload.sceneData;
    return payload;
  }
  return null;
}

export function executeHostCommand(store: HostCommandStore, message: HostCommandMessage): HostCommandResult {
  if (message.command === 'play') {
    store.startRunning();
    return { ok: true };
  }

  if (message.command === 'pause') {
    store.stopRunning();
    return { ok: true };
  }

  if (message.command === 'togglePlay') {
    store.toggleRunning();
    return { ok: true };
  }

  if (message.command === 'reset') {
    store.resetScene();
    return { ok: true };
  }

  if (message.command === 'loadScene') {
    const sceneData = extractScenePayload(message.payload);
    if (!sceneData) {
      return {
        ok: false,
        code: 'validation',
        message: 'loadScene requires a scene payload object.'
      };
    }
    const loaded = store.loadSceneData(sceneData);
    if (!loaded) {
      return {
        ok: false,
        code: 'validation',
        message: 'Scene payload was rejected.'
      };
    }
    return { ok: true };
  }

  return {
    ok: false,
    code: 'invalid-command',
    message: `Unsupported command: ${String(message.command)}`
  };
}

type BridgeOptions = {
  emit: (type: string, payload: Record<string, unknown>) => void;
  allowedOrigins?: string[];
};

export function installHostCommandBridge(store: HostCommandStore, options: BridgeOptions) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const allowedOrigins = new Set(
    (Array.isArray(options.allowedOrigins) ? options.allowedOrigins : [])
      .filter((origin): origin is string => typeof origin === 'string' && origin.trim().length > 0)
  );

  const handler = (event: MessageEvent<unknown>) => {
    if (window.parent !== event.source) return;
    if (allowedOrigins.size > 0 && !allowedOrigins.has(event.origin)) return;
    const message = parseHostCommandMessage(event.data);
    if (!message) return;

    const result = executeHostCommand(store, message);
    options.emit('command-result', {
      id: message.id ?? null,
      command: message.command,
      ok: result.ok,
      ...(result.ok ? {} : { code: result.code, message: result.message })
    });
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
