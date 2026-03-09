export type SceneMutationResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

export function buildPersistableSceneData(options: {
  serializeScene: () => unknown;
  validateSceneData: (data: unknown) => { valid: boolean; error?: string };
}): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  const data = options.serializeScene();
  const validation = options.validateSceneData(data);
  if (!validation.valid || !isRecord(data)) {
    return { ok: false, error: validation.error || '场景数据无效' };
  }
  return { ok: true, data };
}

export function loadValidatedSceneData(options: {
  data: unknown;
  validateSceneData: (data: unknown) => { valid: boolean; error?: string };
  clearScene: () => void;
  loadSceneData: (data: Record<string, unknown>) => void;
  applyModeSettings: () => void;
  onPropertyHide?: () => void;
  requestRender: () => void;
}): SceneMutationResult {
  if (!isRecord(options.data)) {
    return { ok: false, error: '数据格式无效' };
  }
  const validation = options.validateSceneData(options.data);
  if (!validation.valid) {
    return { ok: false, error: validation.error || '场景数据无效' };
  }
  options.clearScene();
  options.loadSceneData(options.data);
  options.applyModeSettings();
  options.onPropertyHide?.();
  options.requestRender();
  return { ok: true };
}
