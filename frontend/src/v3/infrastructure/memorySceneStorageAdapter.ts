import type { SceneAggregateState } from '../domain/types';

type SceneStorageAdapter = {
  save: (key: string, state: SceneAggregateState) => Promise<void>;
  load: (key: string) => Promise<SceneAggregateState | null>;
};

function cloneWithFallback<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeKey(input: string) {
  const key = String(input ?? '').trim();
  if (!key) {
    throw new Error('storage key is required');
  }
  return key;
}

export function createMemorySceneStorageAdapter(): SceneStorageAdapter {
  const stateByKey = new Map<string, SceneAggregateState>();
  return {
    async save(key, state) {
      const normalized = normalizeKey(key);
      stateByKey.set(normalized, cloneWithFallback(state));
    },
    async load(key) {
      const normalized = normalizeKey(key);
      const found = stateByKey.get(normalized);
      if (!found) return null;
      return cloneWithFallback(found);
    }
  };
}

