import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { EmbedConfig, EmbedMode } from '../embed/embedConfig';
import { resolveSceneSource } from '../embed/sceneSourceResolver';
import { validateSceneData } from '../io/sceneIO';
import { getSceneCompatibilityError } from '../io/sceneSchema';
import { createV3SimulatorApplication } from '../v3/application/useCases/simulatorApplication';
import { createInMemoryRenderAdapter } from '../v3/infrastructure/inMemoryRenderAdapter';
import { createLocalSceneStorageAdapter } from '../v3/infrastructure/localSceneStorageAdapter';
import { mapTimeStepIntent, mapToolbarCreateIntent, mapViewportIntent } from '../v3/ui-adapter/intentMappers';

type ToolbarEntry = {
  type: string;
  label: string;
};

type ToolbarGroup = {
  key: string;
  label: string;
  entries: ToolbarEntry[];
};

type DragState = {
  id: string;
  offsetX: number;
  offsetY: number;
} | null;

export type LayoutMode = 'desktop' | 'tablet' | 'phone';

const DEFAULT_STATUS = 'V3 Runtime Ready';

const TOOLBAR_GROUPS: ToolbarGroup[] = [
  {
    key: 'electric',
    label: '电场',
    entries: [{ type: 'electric-field', label: '电场区域' }]
  },
  {
    key: 'magnetic',
    label: '磁场',
    entries: [{ type: 'magnetic-field', label: '磁场区域' }]
  },
  {
    key: 'particle',
    label: '粒子',
    entries: [{ type: 'particle', label: '带电粒子' }]
  }
];

function normalizeCreateType(type: string) {
  const value = String(type ?? '').trim();
  if (
    value === 'electric-field' ||
    value === 'electric-field-rect' ||
    value === 'electric-field-circle' ||
    value === 'semicircle-electric-field'
  ) {
    return 'electric-field';
  }
  if (
    value === 'magnetic-field' ||
    value === 'magnetic-field-circle' ||
    value === 'magnetic-field-long' ||
    value === 'magnetic-field-triangle'
  ) {
    return 'magnetic-field';
  }
  return 'particle';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export const useSimulatorStore = defineStore('simulator', () => {
  const renderAdapter = createInMemoryRenderAdapter();
  const storageAdapter = createLocalSceneStorageAdapter();
  const application = createV3SimulatorApplication({ renderAdapter });

  const hostMode = ref<EmbedMode>('edit');
  const layoutMode = ref<LayoutMode>('desktop');
  const toolbarGroups = ref<ToolbarGroup[]>(TOOLBAR_GROUPS);
  const statusText = ref(DEFAULT_STATUS);
  const fps = ref(0);
  const timeStep = ref(0.016);
  const running = ref(false);
  const objectCount = ref(0);
  const selectedObjectId = ref<string | null>(null);
  const viewport = ref({ width: 1280, height: 720 });
  const objects = ref<Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    radius: number;
    width: number;
    height: number;
    velocityX: number;
    velocityY: number;
    color: string;
    props: Record<string, unknown>;
  }>>([]);
  const sceneNames = ref<string[]>([]);

  const dragState = ref<DragState>(null);
  const runtimeMounted = ref(false);
  const frameHandle = ref<number | null>(null);
  const lastFrameAt = ref<number | null>(null);
  const resetBaseline = ref(application.exportScene());

  const viewMode = computed(() => hostMode.value === 'view');
  const timeStepLabel = computed(() => `${Math.round(timeStep.value * 1000)}ms`);
  const selectedObject = computed(() => objects.value.find((item) => item.id === selectedObjectId.value) ?? null);

  function syncFromReadModel() {
    const model = application.getReadModel();
    running.value = model.running;
    timeStep.value = model.timeStep;
    objectCount.value = model.objectCount;
    selectedObjectId.value = model.selectedObjectId;
    viewport.value = {
      width: model.viewport.width,
      height: model.viewport.height
    };
    objects.value = model.objects;
  }

  async function refreshSceneNames() {
    sceneNames.value = await storageAdapter.list();
  }

  function setStatusText(text: string) {
    statusText.value = String(text || DEFAULT_STATUS);
  }

  function stopLoop() {
    if (frameHandle.value != null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(frameHandle.value);
    }
    frameHandle.value = null;
    lastFrameAt.value = null;
  }

  function stepLoop(timestamp: number) {
    if (!running.value) {
      stopLoop();
      return;
    }

    const previous = lastFrameAt.value;
    if (previous != null) {
      const elapsedMs = Math.max(1, timestamp - previous);
      fps.value = Math.round(1000 / elapsedMs);
    }
    lastFrameAt.value = timestamp;
    const stepped = application.stepSimulation();
    if (!stepped.ok) {
      setStatusText(stepped.error.message);
      stopRunning();
      return;
    }
    syncFromReadModel();
    frameHandle.value = window.requestAnimationFrame(stepLoop);
  }

  function startLoop() {
    if (typeof window === 'undefined') return;
    if (frameHandle.value != null) return;
    frameHandle.value = window.requestAnimationFrame(stepLoop);
  }

  function startRunning() {
    const result = application.startRunning();
    if (!result.ok) {
      setStatusText(result.error.message);
      return;
    }
    syncFromReadModel();
    startLoop();
  }

  function stopRunning() {
    const result = application.stopRunning();
    if (!result.ok) {
      setStatusText(result.error.message);
      return;
    }
    syncFromReadModel();
    stopLoop();
  }

  function toggleRunning() {
    if (running.value) {
      stopRunning();
      return;
    }
    startRunning();
  }

  function setTimeStep(next: number) {
    try {
      const value = mapTimeStepIntent(next);
      const result = application.setTimeStep(value);
      if (!result.ok) {
        setStatusText(result.error.message);
        return false;
      }
      syncFromReadModel();
      setStatusText(`时间步长已更新为 ${Math.round(value * 1000)}ms`);
      return true;
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'timeStep invalid');
      return false;
    }
  }

  function setViewportSize(width: number, height: number) {
    try {
      const payload = mapViewportIntent({ width, height });
      const result = application.setViewport(payload);
      if (!result.ok) {
        setStatusText(result.error.message);
        return false;
      }
      syncFromReadModel();
      return true;
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'viewport invalid');
      return false;
    }
  }

  function createObjectAtCenter(type: string) {
    if (viewMode.value) {
      setStatusText('View mode does not allow edits');
      return false;
    }
    const normalizedType = normalizeCreateType(type);
    const x = viewport.value.width / 2;
    const y = viewport.value.height / 2;
    try {
      const intent = mapToolbarCreateIntent({
        type: normalizedType,
        x,
        y
      });
      const result = application.createObjectAt(intent);
      if (!result.ok) {
        setStatusText(result.error.message);
        return false;
      }
      syncFromReadModel();
      resetBaseline.value = application.exportScene();
      setStatusText(`已创建 ${normalizedType}`);
      return true;
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'create failed');
      return false;
    }
  }

  function selectObjectById(id: string | null) {
    const result = application.selectObject(id);
    if (!result.ok) {
      setStatusText(result.error.message);
      return false;
    }
    syncFromReadModel();
    return true;
  }

  function hitTestObjectId(x: number, y: number) {
    for (let i = objects.value.length - 1; i >= 0; i -= 1) {
      const item = objects.value[i];
      if (item.type === 'particle' || item.type === 'magnetic-field') {
        const dx = x - item.x;
        const dy = y - item.y;
        const radius = item.type === 'particle'
          ? item.radius
          : Math.max(item.radius, Math.min(item.width, item.height) / 2);
        if ((dx * dx + dy * dy) <= (radius * radius)) {
          return item.id;
        }
        continue;
      }
      const halfWidth = item.width / 2;
      const halfHeight = item.height / 2;
      if (
        x >= (item.x - halfWidth) &&
        x <= (item.x + halfWidth) &&
        y >= (item.y - halfHeight) &&
        y <= (item.y + halfHeight)
      ) {
        return item.id;
      }
    }
    return null;
  }

  function selectObjectAt(x: number, y: number) {
    return selectObjectById(hitTestObjectId(x, y));
  }

  function beginObjectDrag(pointerX: number, pointerY: number, objectId: string | null) {
    if (!objectId) return false;
    const target = objects.value.find((item) => item.id === objectId);
    if (!target) return false;
    selectObjectById(objectId);
    dragState.value = {
      id: target.id,
      offsetX: pointerX - target.x,
      offsetY: pointerY - target.y
    };
    return true;
  }

  function updateObjectDrag(pointerX: number, pointerY: number) {
    const activeDrag = dragState.value;
    if (!activeDrag) return false;
    const nextX = clamp(pointerX - activeDrag.offsetX, 0, viewport.value.width);
    const nextY = clamp(pointerY - activeDrag.offsetY, 0, viewport.value.height);
    const result = application.moveObject({
      id: activeDrag.id,
      x: nextX,
      y: nextY
    });
    if (!result.ok) {
      setStatusText(result.error.message);
      return false;
    }
    syncFromReadModel();
    return true;
  }

  function commitObjectDrag() {
    if (!dragState.value) return false;
    dragState.value = null;
    resetBaseline.value = application.exportScene();
    return true;
  }

  function cancelObjectDrag() {
    dragState.value = null;
  }

  function setSelectedObjectProps(props: Record<string, unknown>) {
    if (!selectedObjectId.value) return false;
    const result = application.setObjectProps({
      id: selectedObjectId.value,
      props
    });
    if (!result.ok) {
      setStatusText(result.error.message);
      return false;
    }
    syncFromReadModel();
    resetBaseline.value = application.exportScene();
    return true;
  }

  function deleteSelected() {
    if (!selectedObjectId.value) return false;
    const result = application.deleteObject(selectedObjectId.value);
    if (!result.ok) {
      setStatusText(result.error.message);
      return false;
    }
    syncFromReadModel();
    resetBaseline.value = application.exportScene();
    return true;
  }

  function clearScene() {
    const result = application.clearScene();
    if (!result.ok) {
      setStatusText(result.error.message);
      return false;
    }
    syncFromReadModel();
    resetBaseline.value = application.exportScene();
    setStatusText('场景已清空');
    return true;
  }

  function resetScene() {
    const result = application.loadScene(resetBaseline.value);
    if (!result.ok) {
      setStatusText(result.error.message);
      return false;
    }
    stopRunning();
    syncFromReadModel();
    setStatusText('场景已重置');
    return true;
  }

  function serializeScene() {
    return application.exportScene();
  }

  function loadSceneData(data: Record<string, unknown>) {
    const compatibilityError = getSceneCompatibilityError(data);
    if (compatibilityError) {
      setStatusText(compatibilityError);
      return false;
    }
    const validated = validateSceneData(data);
    if (!validated.ok) {
      setStatusText(validated.error);
      return false;
    }
    const result = application.loadScene(validated.data);
    if (!result.ok) {
      setStatusText(result.error.message);
      return false;
    }
    stopRunning();
    syncFromReadModel();
    resetBaseline.value = application.exportScene();
    setStatusText('场景已加载');
    return true;
  }

  function exportScene() {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      setStatusText('当前环境不支持导出');
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
    setStatusText('场景已导出');
    return true;
  }

  async function importScene(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      return loadSceneData(parsed);
    } catch {
      setStatusText('导入失败：无效 JSON');
      return false;
    }
  }

  async function saveScene(name: string) {
    const sceneName = String(name ?? '').trim();
    if (!sceneName) return false;
    try {
      await storageAdapter.save(sceneName, serializeScene());
      await refreshSceneNames();
      setStatusText(`场景 "${sceneName}" 已保存`);
      return true;
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : '保存失败');
      return false;
    }
  }

  async function loadScene(name: string) {
    const sceneName = String(name ?? '').trim();
    if (!sceneName) return false;
    try {
      const data = await storageAdapter.load(sceneName);
      if (!data) {
        setStatusText(`场景 "${sceneName}" 不存在`);
        return false;
      }
      return loadSceneData(data as Record<string, unknown>);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : '加载失败');
      return false;
    }
  }

  function setHostMode(next: EmbedMode) {
    hostMode.value = next === 'view' ? 'view' : 'edit';
    if (hostMode.value === 'view') {
      dragState.value = null;
    }
  }

  function setLayoutMode(next: LayoutMode) {
    if (next !== 'desktop' && next !== 'tablet' && next !== 'phone') return;
    layoutMode.value = next;
  }

  function mountRuntime() {
    if (runtimeMounted.value) return;
    runtimeMounted.value = true;
    syncFromReadModel();
    void refreshSceneNames();
  }

  function unmountRuntime() {
    if (!runtimeMounted.value) return;
    runtimeMounted.value = false;
    stopLoop();
  }

  async function bootstrapFromEmbed(config: EmbedConfig) {
    setHostMode(config.mode);
    const resolved = await resolveSceneSource(config);
    if (!resolved.ok) {
      setStatusText(resolved.message);
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
          error: statusText.value
        };
      }
    }
    if (config.autoplay) {
      startRunning();
    }
    return { ok: true as const };
  }

  syncFromReadModel();

  return {
    hostMode,
    layoutMode,
    toolbarGroups,
    running,
    timeStep,
    timeStepLabel,
    fps,
    objectCount,
    selectedObjectId,
    selectedObject,
    viewport,
    objects,
    sceneNames,
    statusText,
    viewMode,
    setStatusText,
    mountRuntime,
    unmountRuntime,
    setHostMode,
    setLayoutMode,
    setViewportSize,
    startRunning,
    stopRunning,
    toggleRunning,
    setTimeStep,
    createObjectAtCenter,
    selectObjectById,
    selectObjectAt,
    hitTestObjectId,
    beginObjectDrag,
    updateObjectDrag,
    commitObjectDrag,
    cancelObjectDrag,
    setSelectedObjectProps,
    deleteSelected,
    clearScene,
    resetScene,
    loadSceneData,
    exportScene,
    importScene,
    saveScene,
    loadScene,
    bootstrapFromEmbed
  };
});
