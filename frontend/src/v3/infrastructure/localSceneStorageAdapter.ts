import type { SceneAggregateState } from '../domain/types';

type LocalSceneStorageAdapter = {
  save: (key: string, state: SceneAggregateState) => Promise<void>;
  load: (key: string) => Promise<SceneAggregateState | null>;
  list: () => Promise<string[]>;
  remove: (key: string) => Promise<void>;
};

const STORAGE_PREFIX = 'sim.v3.scene.';

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

function resolveStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  const storage = window.localStorage;
  if (!storage) return null;
  return storage;
}

export function createLocalSceneStorageAdapter(): LocalSceneStorageAdapter {
  return {
    async save(key, state) {
      const normalized = normalizeKey(key);
      const storage = resolveStorage();
      if (!storage) {
        throw new Error('localStorage is unavailable');
      }
      storage.setItem(`${STORAGE_PREFIX}${normalized}`, JSON.stringify(cloneWithFallback(state)));
    },
    async load(key) {
      const normalized = normalizeKey(key);
      const storage = resolveStorage();
      if (!storage) return null;
      const raw = storage.getItem(`${STORAGE_PREFIX}${normalized}`);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as SceneAggregateState;
      } catch {
        return null;
      }
    },
    async list() {
      const storage = resolveStorage();
      if (!storage) return [];
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
        keys.push(key.slice(STORAGE_PREFIX.length));
      }
      keys.sort((a, b) => a.localeCompare(b));
      return keys;
    },
    async remove(key) {
      const normalized = normalizeKey(key);
      const storage = resolveStorage();
      if (!storage) return;
      storage.removeItem(`${STORAGE_PREFIX}${normalized}`);
    }
  };
}
