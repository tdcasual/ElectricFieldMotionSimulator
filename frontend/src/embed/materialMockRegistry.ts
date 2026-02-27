type MaterialSceneSource = {
  sceneUrl?: string | null;
  sceneData?: unknown;
};

const MATERIAL_SCENE_MOCKS: Record<string, MaterialSceneSource> = {
  'mock-empty': {
    sceneUrl: '/scenes/embed-empty.json'
  },
  'mock-particle': {
    sceneUrl: '/scenes/material-mock-particle.json'
  }
};

export function resolveMockMaterial(materialId: string): MaterialSceneSource | null {
  const key = String(materialId || '').trim();
  if (!key) return null;
  return MATERIAL_SCENE_MOCKS[key] ?? null;
}

export function listMockMaterials() {
  return Object.keys(MATERIAL_SCENE_MOCKS);
}
