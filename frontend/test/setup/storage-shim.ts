type StorageMethods = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear' | 'key'>;

function hasStorageMethods(candidate: unknown): candidate is StorageMethods {
  if (!candidate || typeof candidate !== 'object') return false;
  const value = candidate as Record<string, unknown>;
  return (
    typeof value.getItem === 'function' &&
    typeof value.setItem === 'function' &&
    typeof value.removeItem === 'function' &&
    typeof value.clear === 'function' &&
    typeof value.key === 'function'
  );
}

function createMemoryStorage(): Storage {
  const state = new Map<string, string>();
  return {
    get length() {
      return state.size;
    },
    clear() {
      state.clear();
    },
    getItem(key: string) {
      const normalized = String(key);
      return state.has(normalized) ? state.get(normalized)! : null;
    },
    key(index: number) {
      if (!Number.isInteger(index) || index < 0 || index >= state.size) return null;
      return Array.from(state.keys())[index] ?? null;
    },
    removeItem(key: string) {
      state.delete(String(key));
    },
    setItem(key: string, value: string) {
      state.set(String(key), String(value));
    }
  };
}

function assignStorage(target: object, storage: Storage) {
  try {
    (target as Record<string, unknown>).localStorage = storage;
  } catch {
    // ignore write failure; fallback to defineProperty below
  }

  if (hasStorageMethods((target as Record<string, unknown>).localStorage)) {
    return;
  }

  try {
    Object.defineProperty(target, 'localStorage', {
      configurable: true,
      writable: true,
      value: storage
    });
  } catch {
    // ignore defineProperty failure; caller will keep best-effort storage
  }
}

const globalStorage: unknown = Reflect.get(globalThis as object, 'localStorage');
const windowStorage: unknown = Reflect.get(window as object, 'localStorage');

const sharedStorage: Storage =
  hasStorageMethods(windowStorage) ? (windowStorage as Storage) :
    hasStorageMethods(globalStorage) ? (globalStorage as Storage) :
      createMemoryStorage();

if (!hasStorageMethods(windowStorage)) {
  assignStorage(window, sharedStorage);
}
if (!hasStorageMethods(globalStorage)) {
  assignStorage(globalThis, sharedStorage);
}
