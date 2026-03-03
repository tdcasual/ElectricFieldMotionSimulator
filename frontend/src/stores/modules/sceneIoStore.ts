import type { EmbedConfig, EmbedMode } from '../../embed/embedConfig';
import { resolveSceneSource } from '../../embed/sceneSourceResolver';
import { validateSceneData } from '../../io/sceneIO';
import type {
  SceneIoStateRefs,
  SceneStorageAdapter,
  SetStatusText,
  SimulatorApplication
} from './types';

type CreateSceneIoModuleContext = SceneIoStateRefs & {
  application: SimulatorApplication;
  storageAdapter: SceneStorageAdapter;
  setStatusText: SetStatusText;
  getStatusText: () => string;
  syncFromReadModel: () => void;
  stopRunning: () => void;
  startRunning: () => void;
  setHostMode: (mode: EmbedMode) => void;
};

export function createSceneIoModule(ctx: CreateSceneIoModuleContext) {
  function serializeScene() {
    return ctx.application.exportScene();
  }

  function loadSceneData(data: Record<string, unknown>) {
    const validated = validateSceneData(data);
    if (!validated.ok) {
      ctx.setStatusText(validated.error);
      return false;
    }

    const result = ctx.application.loadScene(validated.data);
    if (!result.ok) {
      ctx.setStatusText(result.error.message);
      return false;
    }

    ctx.stopRunning();
    ctx.syncFromReadModel();
    ctx.resetBaseline.value = ctx.application.exportScene();
    ctx.setStatusText('场景已加载');
    return true;
  }

  function exportScene() {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      ctx.setStatusText('当前环境不支持导出');
      return false;
    }

    const payload = serializeScene();
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `electric-field-scene-v3-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    ctx.setStatusText('场景已导出');
    return true;
  }

  async function importScene(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      return loadSceneData(parsed);
    } catch {
      ctx.setStatusText('导入失败：无效 JSON');
      return false;
    }
  }

  async function saveScene(name: string) {
    const sceneName = String(name ?? '').trim();
    if (!sceneName) return false;

    try {
      await ctx.storageAdapter.save(sceneName, serializeScene());
      ctx.setStatusText(`场景 "${sceneName}" 已保存`);
      return true;
    } catch (error) {
      ctx.setStatusText(error instanceof Error ? error.message : '保存失败');
      return false;
    }
  }

  async function loadScene(name: string) {
    const sceneName = String(name ?? '').trim();
    if (!sceneName) return false;

    try {
      const data = await ctx.storageAdapter.load(sceneName);
      if (!data) {
        ctx.setStatusText(`场景 "${sceneName}" 不存在`);
        return false;
      }
      return loadSceneData(data as Record<string, unknown>);
    } catch (error) {
      ctx.setStatusText(error instanceof Error ? error.message : '加载失败');
      return false;
    }
  }

  async function bootstrapFromEmbed(config: EmbedConfig) {
    ctx.setHostMode(config.mode);

    const resolved = await resolveSceneSource(config);
    if (!resolved.ok) {
      ctx.setStatusText(resolved.message);
      return {
        ok: false as const,
        code: resolved.code,
        error: resolved.message
      };
    }

    if (resolved.data) {
      const loaded = loadSceneData(resolved.data as unknown as Record<string, unknown>);
      if (!loaded) {
        return {
          ok: false as const,
          code: 'validation',
          error: ctx.getStatusText()
        };
      }
    }

    if (config.autoplay) {
      ctx.startRunning();
    }

    return { ok: true as const };
  }

  return {
    serializeScene,
    loadSceneData,
    exportScene,
    importScene,
    saveScene,
    loadScene,
    bootstrapFromEmbed
  };
}
