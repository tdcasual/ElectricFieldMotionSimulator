import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { registry } from '../../../js/core/registerObjects.js';
import { Presets } from '../../../js/presets/Presets.js';
import {
  SimulatorRuntime,
  type PropertyPayload,
  type RuntimeSnapshot
} from '../runtime/simulatorRuntime';

type ToolbarEntry = {
  type: string;
  label: string;
  icon?: string | null;
};

type ToolbarGroup = {
  key: string;
  label: string;
  entries: ToolbarEntry[];
};

const CATEGORY_LABELS: Record<string, string> = {
  electric: '电场',
  magnetic: '磁场',
  particle: '粒子',
  display: '显示'
};

const CATEGORY_ORDER = ['electric', 'magnetic', 'particle', 'display'];

function buildToolbarGroups(): ToolbarGroup[] {
  const grouped = registry.listByCategory() as Record<string, Array<Record<string, unknown>>>;
  const remaining = new Set(Object.keys(grouped));
  const ordered: string[] = [];

  for (const key of CATEGORY_ORDER) {
    if (remaining.has(key)) {
      ordered.push(key);
      remaining.delete(key);
    }
  }

  for (const key of remaining) {
    ordered.push(key);
  }

  return ordered
    .map((key) => {
      const entries = grouped[key] ?? [];
      return {
        key,
        label: CATEGORY_LABELS[key] ?? key,
        entries: entries
          .map((entry) => ({
            type: String(entry.type ?? ''),
            label: String(entry.label ?? entry.type ?? ''),
            icon: typeof entry.icon === 'string' ? entry.icon : null
          }))
          .filter((entry) => entry.type.length > 0)
      };
    })
    .filter((group) => group.entries.length > 0);
}

function asPositiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function asNonNegativeNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function normalizeBoundaryMode(value: unknown) {
  const allowed = new Set(['margin', 'remove', 'bounce', 'wrap']);
  const next = String(value ?? '');
  return allowed.has(next) ? next : 'margin';
}

export const useSimulatorStore = defineStore('simulator', () => {
  const runtime = shallowRef<SimulatorRuntime | null>(null);
  const runtimeMounted = ref(false);

  const toolbarGroups = ref<ToolbarGroup[]>(buildToolbarGroups());

  const running = ref(false);
  const demoMode = ref(false);
  const timeStep = ref(0.016);
  const fps = ref(0);
  const objectCount = ref(0);
  const particleCount = ref(0);
  const selectedObjectId = ref<string | null>(null);
  const statusText = ref('就绪');

  const showEnergyOverlay = ref(true);
  const pixelsPerMeter = ref(1);
  const gravity = ref(10);
  const boundaryMode = ref<'margin' | 'remove' | 'bounce' | 'wrap'>('margin');
  const boundaryMargin = ref(200);

  const propertyDrawerOpen = ref(false);
  const propertyTitle = ref('属性面板');
  const propertySections = ref<PropertyPayload['sections']>([]);
  const propertyValues = ref<Record<string, unknown>>({});

  const timeStepLabel = computed(() => `${Math.round(timeStep.value * 1000)}ms`);
  const showBoundaryMarginControl = computed(() => boundaryMode.value === 'margin');
  const demoButtonLabel = computed(() => (demoMode.value ? '退出演示' : '演示模式'));
  const demoButtonTitle = computed(() => (demoMode.value ? '退出演示模式' : '进入演示模式'));

  function applySnapshot(snapshot: RuntimeSnapshot) {
    running.value = snapshot.running;
    demoMode.value = snapshot.mode === 'demo';
    timeStep.value = snapshot.timeStep;
    fps.value = snapshot.fps;
    objectCount.value = snapshot.objectCount;
    particleCount.value = snapshot.particleCount;
    selectedObjectId.value = snapshot.selectedObjectId;
    statusText.value = snapshot.statusText;
  }

  function syncHeaderControlsFromScene() {
    const current = runtime.value;
    if (!current) return;
    const settings = (current.scene as { settings?: Record<string, unknown> }).settings ?? {};
    showEnergyOverlay.value = settings.showEnergy !== false;
    pixelsPerMeter.value = asPositiveNumber(settings.pixelsPerMeter, 1);
    gravity.value = asNonNegativeNumber(settings.gravity, 10);
    boundaryMode.value = normalizeBoundaryMode(settings.boundaryMode);
    boundaryMargin.value = asNonNegativeNumber(settings.boundaryMargin, 200);
  }

  function updatePropertyPayload(payload: PropertyPayload) {
    propertyTitle.value = payload.title;
    propertySections.value = payload.sections;
    propertyValues.value = { ...(payload.values ?? {}) };
  }

  function closePropertyPanel() {
    propertyDrawerOpen.value = false;
  }

  function openPropertyPanel() {
    const current = runtime.value;
    if (!current) return false;
    const payload = current.buildPropertyPayload();
    if (!payload) {
      closePropertyPanel();
      return false;
    }
    updatePropertyPayload(payload);
    propertyDrawerOpen.value = true;
    return true;
  }

  function ensureRuntime() {
    if (runtime.value) return runtime.value;
    runtime.value = new SimulatorRuntime({
      onSnapshot: (snapshot) => {
        applySnapshot(snapshot);
        syncHeaderControlsFromScene();
      },
      onPropertyRequest: () => {
        openPropertyPanel();
      },
      onPropertyHide: () => {
        closePropertyPanel();
      }
    });
    return runtime.value;
  }

  function getRuntime() {
    const current = ensureRuntime();
    if (!runtimeMounted.value && import.meta.env.MODE !== 'test') {
      current.mount();
      runtimeMounted.value = true;
      applySnapshot(current.getSnapshot());
      syncHeaderControlsFromScene();
    }
    return current;
  }

  function mountRuntime() {
    if (runtimeMounted.value) return;
    const current = ensureRuntime();
    current.mount();
    runtimeMounted.value = true;
    applySnapshot(current.getSnapshot());
    syncHeaderControlsFromScene();
  }

  function unmountRuntime() {
    if (!runtimeMounted.value) return;
    runtime.value?.unmount();
    runtimeMounted.value = false;
  }

  function toggleRunning() {
    getRuntime().toggleRunning();
  }

  function toggleDemoMode() {
    getRuntime().toggleDemoMode();
  }

  function setTimeStep(next: number) {
    if (!Number.isFinite(next) || next <= 0) return;
    getRuntime().setTimeStep(next);
    timeStep.value = next;
  }

  function setShowEnergyOverlay(next: boolean) {
    const current = getRuntime();
    showEnergyOverlay.value = !!next;
    current.scene.settings.showEnergy = !!next;
    current.requestRender({ updateUI: true, trackBaseline: false });
  }

  function setPixelsPerMeter(next: number) {
    if (!Number.isFinite(next) || next <= 0) return;
    const current = getRuntime();
    pixelsPerMeter.value = next;
    current.scene.settings.pixelsPerMeter = next;
    current.requestRender({ invalidateFields: true, updateUI: true });
  }

  function setGravity(next: number) {
    if (!Number.isFinite(next) || next < 0) return;
    const current = getRuntime();
    gravity.value = next;
    current.scene.settings.gravity = next;
    current.requestRender({ updateUI: true });
  }

  function setBoundaryMode(next: 'margin' | 'remove' | 'bounce' | 'wrap') {
    const current = getRuntime();
    boundaryMode.value = next;
    current.scene.settings.boundaryMode = next;
    current.requestRender({ updateUI: true });
  }

  function setBoundaryMargin(next: number) {
    if (!Number.isFinite(next) || next < 0) return;
    const current = getRuntime();
    boundaryMargin.value = next;
    current.scene.settings.boundaryMargin = next;
    current.requestRender({ updateUI: true });
  }

  function createObjectAtCenter(type: string) {
    if (!type) return;
    getRuntime().createObjectAtCenter(type);
  }

  function duplicateSelected() {
    getRuntime().duplicateSelected();
  }

  function deleteSelected() {
    getRuntime().deleteSelected();
    closePropertyPanel();
  }

  function resetScene() {
    const restored = getRuntime().resetScene();
    if (!restored) {
      setStatusText('暂无可重置的起始状态');
    }
  }

  function clearScene() {
    getRuntime().clearScene();
  }

  function saveScene(name: string) {
    if (!name || !name.trim()) return;
    getRuntime().saveScene(name.trim());
    setStatusText(`场景 "${name.trim()}" 已保存`);
  }

  function loadScene(name: string) {
    if (!name || !name.trim()) return false;
    const ok = getRuntime().loadScene(name.trim());
    if (ok) {
      closePropertyPanel();
      setStatusText(`场景 "${name.trim()}" 已加载`);
    } else {
      setStatusText(`场景 "${name.trim()}" 不存在`);
    }
    return ok;
  }

  function exportScene() {
    getRuntime().exportScene();
    setStatusText('场景已导出');
  }

  async function importScene(file: File) {
    const ok = await getRuntime().importScene(file);
    if (ok) {
      closePropertyPanel();
      setStatusText('场景已导入');
    } else {
      setStatusText('导入失败');
    }
    return ok;
  }

  function loadPreset(name: string) {
    const preset = Presets.get(name);
    if (!preset) return false;
    const current = getRuntime();
    current.stop();
    current.scene.clear();
    current.scene.loadFromData(preset.data);
    closePropertyPanel();
    current.requestRender({ invalidateFields: true, forceRender: true, updateUI: true, trackBaseline: true });
    setStatusText(`已加载预设场景: ${preset.name}`);
    return true;
  }

  function toggleTheme() {
    getRuntime().toggleTheme();
  }

  function setStatusText(text: string) {
    const message = String(text || '就绪');
    statusText.value = message;
    runtime.value?.setStatusText(message);
  }

  function applyPropertyValues(values: Record<string, unknown>) {
    try {
      getRuntime().applySelectedProperties(values);
      openPropertyPanel();
      return { ok: true as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : '属性应用失败';
      setStatusText(message);
      return { ok: false as const, error: message };
    }
  }

  return {
    toolbarGroups,
    running,
    demoMode,
    timeStep,
    fps,
    objectCount,
    particleCount,
    selectedObjectId,
    statusText,
    showEnergyOverlay,
    pixelsPerMeter,
    gravity,
    boundaryMode,
    boundaryMargin,
    propertyDrawerOpen,
    propertyTitle,
    propertySections,
    propertyValues,
    timeStepLabel,
    showBoundaryMarginControl,
    demoButtonLabel,
    demoButtonTitle,
    mountRuntime,
    unmountRuntime,
    toggleRunning,
    toggleDemoMode,
    setTimeStep,
    setShowEnergyOverlay,
    setPixelsPerMeter,
    setGravity,
    setBoundaryMode,
    setBoundaryMargin,
    createObjectAtCenter,
    duplicateSelected,
    deleteSelected,
    resetScene,
    clearScene,
    saveScene,
    loadScene,
    exportScene,
    importScene,
    loadPreset,
    toggleTheme,
    setStatusText,
    openPropertyPanel,
    closePropertyPanel,
    applyPropertyValues
  };
});
