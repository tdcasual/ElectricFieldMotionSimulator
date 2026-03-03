import type { SceneReadModel } from '../application/readModel/projectSceneReadModel';

type InMemoryRenderAdapter = {
  publish: (snapshot: SceneReadModel) => void;
  getLatest: () => SceneReadModel | null;
};

function cloneWithFallback<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createInMemoryRenderAdapter(): InMemoryRenderAdapter {
  let latest: SceneReadModel | null = null;
  return {
    publish(snapshot) {
      latest = cloneWithFallback(snapshot);
    },
    getLatest() {
      if (!latest) return null;
      return cloneWithFallback(latest);
    }
  };
}

