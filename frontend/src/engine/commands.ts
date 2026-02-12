import type { EngineCommand } from './types';

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null;
}

function hasString(value: AnyRecord, key: string): value is AnyRecord & { [K in typeof key]: string } {
  return typeof value[key] === 'string' && value[key].length > 0;
}

export function isCommand(value: unknown): value is EngineCommand {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }

  if (value.type === 'addObject') {
    if (!isRecord(value.payload)) return false;
    return hasString(value.payload, 'objectType');
  }

  if (value.type === 'updateObjectProps') {
    if (!isRecord(value.payload)) return false;
    if (!hasString(value.payload, 'id')) return false;
    return isRecord(value.payload.patch);
  }

  if (value.type === 'toggleDemoMode') {
    return value.payload == null || isRecord(value.payload);
  }

  return false;
}
