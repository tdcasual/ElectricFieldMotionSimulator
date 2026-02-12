import type { SceneData } from './sceneSchema';

const KEY_PREFIX = 'electric-field-scene:';
const memoryStorage = new Map<string, string>();

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function keyFor(name: string) {
  return `${KEY_PREFIX}${name}`;
}

function getStorage(): StorageLike {
  const candidate = (globalThis as { localStorage?: Partial<StorageLike> }).localStorage;
  if (
    candidate &&
    typeof candidate.getItem === 'function' &&
    typeof candidate.setItem === 'function' &&
    typeof candidate.removeItem === 'function'
  ) {
    return {
      getItem: candidate.getItem.bind(candidate),
      setItem: candidate.setItem.bind(candidate),
      removeItem: candidate.removeItem.bind(candidate)
    };
  }

  return {
    getItem(key: string) {
      return memoryStorage.has(key) ? (memoryStorage.get(key) ?? null) : null;
    },
    setItem(key: string, value: string) {
      memoryStorage.set(key, value);
    },
    removeItem(key: string) {
      memoryStorage.delete(key);
    }
  };
}

export function saveScene(name: string, data: SceneData) {
  if (!name || !name.trim()) return;
  getStorage().setItem(keyFor(name.trim()), JSON.stringify(data));
}

export function loadScene(name: string): SceneData | null {
  if (!name || !name.trim()) return null;
  const raw = getStorage().getItem(keyFor(name.trim()));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SceneData;
  } catch {
    return null;
  }
}

export function deleteScene(name: string) {
  if (!name || !name.trim()) return;
  getStorage().removeItem(keyFor(name.trim()));
}
