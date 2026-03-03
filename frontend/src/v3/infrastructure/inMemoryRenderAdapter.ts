import type { SceneReadModel } from '../application/readModel/projectSceneReadModel';

type InMemoryRenderAdapter = {
  publish: (snapshot: SceneReadModel) => void;
};

export function createInMemoryRenderAdapter(): InMemoryRenderAdapter {
  return {
    publish(_snapshot) {
      // Render adapter is currently a write-only bridge for application publish side effects.
    }
  };
}
