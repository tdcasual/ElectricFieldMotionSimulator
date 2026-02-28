import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { Presets, registry } from '../engine/legacyBridge';
import {
  SimulatorRuntime,
  type PropertyPayload,
  type RuntimeSnapshot
} from '../runtime/simulatorRuntime';
import type { EmbedConfig, EmbedMode } from '../embed/embedConfig';
import { resolveSceneSource } from '../embed/sceneSourceResolver';

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

export type LayoutMode = 'desktop' | 'tablet' | 'phone';
export type ActiveDrawer = 'property' | 'variables' | 'markdown' | null;
export type PhoneDensityMode = 'compact' | 'comfortable';

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
  const allowed = new Set(['margin', 'remove', 'bounce', 'wrap'] as const);
  const next = String(value ?? '');
  return allowed.has(next as 'margin' | 'remove' | 'bounce' | 'wrap')
    ? (next as 'margin' | 'remove' | 'bounce' | 'wrap')
    : 'margin';
}

const DEFAULT_MARKDOWN_FONT_SIZE = 16;
const LEGACY_MARKDOWN_FONT_SIZE = 13;
const TAP_CHAIN_RESET_EVENT = 'simulator-reset-tap-chain';

export const useSimulatorStore = defineStore('simulator', () => {
  const runtime = shallowRef<SimulatorRuntime | null>(null);
  const runtimeMounted = ref(false);
  const hostMode = ref<EmbedMode>('edit');
  const layoutMode = ref<LayoutMode>('desktop');
  const phoneDensityMode = ref<PhoneDensityMode>('compact');

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
  const classroomMode = ref(false);

  const activeDrawer = ref<ActiveDrawer>(null);
  const propertyDrawerOpen = computed(() => activeDrawer.value === 'property');
  const propertyTitle = ref('属性面板');
  const propertySections = ref<PropertyPayload['sections']>([]);
  const propertyValues = ref<Record<string, unknown>>({});
  const variablesPanelOpen = computed(() => activeDrawer.value === 'variables');
  const variableDraft = ref<Record<string, number>>({});
  const markdownBoardOpen = computed(() => activeDrawer.value === 'markdown');
  const markdownContent = ref('# 题板\n\n- 在这里记录题目和步骤\n- 支持基础 Markdown 语法\n- 支持 LaTeX：$v=\\frac{s}{t}$');
  const markdownMode = ref<'edit' | 'preview'>('preview');
  const markdownFontSize = ref(DEFAULT_MARKDOWN_FONT_SIZE);

  const viewMode = computed(() => hostMode.value === 'view');
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

  function loadMarkdownPreferences() {
    if (typeof window === 'undefined') return;
    try {
      const content = window.localStorage.getItem('sim.markdown.content');
      if (typeof content === 'string') {
        markdownContent.value = content;
      }

      const mode = window.localStorage.getItem('sim.markdown.mode');
      if (mode === 'edit' || mode === 'preview') {
        markdownMode.value = mode;
      }

      const fontSize = Number(window.localStorage.getItem('sim.markdown.fontSize'));
      if (Number.isFinite(fontSize)) {
        const normalized = Math.max(10, Math.min(32, Math.round(fontSize)));
        const migrated = normalized === LEGACY_MARKDOWN_FONT_SIZE ? DEFAULT_MARKDOWN_FONT_SIZE : normalized;
        markdownFontSize.value = migrated;
        if (migrated !== normalized) {
          window.localStorage.setItem('sim.markdown.fontSize', String(migrated));
        }
      }
    } catch {
      // ignore persistence errors
    }
  }

  function loadClassroomPreference() {
    if (typeof window === 'undefined') return;
    try {
      classroomMode.value = window.localStorage.getItem('sim.ui.classroomMode') === '1';
    } catch {
      classroomMode.value = false;
    }
  }

  function persistClassroomPreference() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('sim.ui.classroomMode', classroomMode.value ? '1' : '0');
    } catch {
      // ignore persistence errors
    }
  }

  function persistMarkdownPreferences() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('sim.markdown.content', markdownContent.value);
      window.localStorage.setItem('sim.markdown.mode', markdownMode.value);
      window.localStorage.setItem('sim.markdown.fontSize', String(markdownFontSize.value));
    } catch {
      // ignore persistence errors
    }
  }

  function loadPhoneDensityPreference() {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('sim.ui.phoneDensity');
      if (raw === 'compact' || raw === 'comfortable') {
        phoneDensityMode.value = raw;
      }
    } catch {
      phoneDensityMode.value = 'compact';
    }
  }

  function persistPhoneDensityPreference() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('sim.ui.phoneDensity', phoneDensityMode.value);
    } catch {
      // ignore persistence errors
    }
  }

  function dispatchTapChainResetEvent() {
    if (typeof document === 'undefined') return;
    try {
      document.dispatchEvent(new Event(TAP_CHAIN_RESET_EVENT));
    } catch {
      // ignore event dispatch errors
    }
  }

  function openDrawer(target: Exclude<ActiveDrawer, null>) {
    activeDrawer.value = target;
  }

  function closeDrawer(target: Exclude<ActiveDrawer, null>) {
    if (activeDrawer.value !== target) return;
    activeDrawer.value = null;
  }

  function closeAllDrawers() {
    activeDrawer.value = null;
  }

  function closePropertyPanel() {
    const wasOpen = propertyDrawerOpen.value;
    closeDrawer('property');
    if (wasOpen) {
      dispatchTapChainResetEvent();
    }
  }

  function refreshSelectedPropertyPayload() {
    const current = runtime.value;
    if (!current) return false;
    const payload = current.buildPropertyPayload();
    if (!payload) {
      closePropertyPanel();
      return false;
    }
    updatePropertyPayload(payload);
    return true;
  }

  function openPropertyPanel() {
    const ok = refreshSelectedPropertyPayload();
    if (!ok) return false;
    openDrawer('property');
    dispatchTapChainResetEvent();
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
    runtime.value.setHostMode(hostMode.value);
    return runtime.value;
  }

  function normalizeSceneVariables(input: Record<string, unknown>) {
    const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
    const RESERVED = new Set(['__proto__', 'prototype', 'constructor']);
    const next: Record<string, number> = {};
    for (const [rawName, rawValue] of Object.entries(input)) {
      const name = String(rawName || '').trim();
      if (!name || !NAME_RE.test(name) || RESERVED.has(name)) continue;
      const value = Number(rawValue);
      if (!Number.isFinite(value)) continue;
      next[name] = value;
    }
    return next;
  }

  function openVariablesPanel() {
    const current = getRuntime();
    const vars = current.scene.variables && typeof current.scene.variables === 'object'
      ? current.scene.variables as Record<string, unknown>
      : {};
    variableDraft.value = normalizeSceneVariables(vars);
    openDrawer('variables');
  }

  function closeVariablesPanel() {
    closeDrawer('variables');
  }

  function applyVariables(values: Record<string, number>) {
    const current = getRuntime();
    const next = normalizeSceneVariables(values as Record<string, unknown>);
    current.scene.variables = { ...next };
    variableDraft.value = { ...next };
    current.requestRender({ invalidateFields: true, forceRender: true, updateUI: true, trackBaseline: true });
    setStatusText(`变量表已更新（${Object.keys(next).length} 项）`);
    closeVariablesPanel();
    return true;
  }

  function toggleMarkdownBoard() {
    if (activeDrawer.value === 'markdown') {
      closeDrawer('markdown');
      return;
    }
    openDrawer('markdown');
  }

  function closeMarkdownBoard() {
    closeDrawer('markdown');
  }

  function setMarkdownContent(next: string) {
    markdownContent.value = String(next ?? '');
    persistMarkdownPreferences();
  }

  function setMarkdownMode(next: 'edit' | 'preview') {
    markdownMode.value = next === 'edit' ? 'edit' : 'preview';
    persistMarkdownPreferences();
  }

  function setMarkdownFontSize(next: number) {
    if (!Number.isFinite(next)) return;
    markdownFontSize.value = Math.max(10, Math.min(32, Math.round(next)));
    persistMarkdownPreferences();
  }

  loadMarkdownPreferences();
  loadClassroomPreference();
  loadPhoneDensityPreference();

  function setClassroomMode(next: boolean) {
    classroomMode.value = !!next;
    persistClassroomPreference();
  }

  function toggleClassroomMode() {
    setClassroomMode(!classroomMode.value);
  }

  function setPhoneDensityMode(next: PhoneDensityMode) {
    phoneDensityMode.value = next === 'comfortable' ? 'comfortable' : 'compact';
    persistPhoneDensityPreference();
  }

  function togglePhoneDensityMode() {
    setPhoneDensityMode(phoneDensityMode.value === 'compact' ? 'comfortable' : 'compact');
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

  function setHostMode(next: EmbedMode) {
    hostMode.value = next === 'view' ? 'view' : 'edit';
    runtime.value?.setHostMode(hostMode.value);
    if (hostMode.value === 'view') {
      closeAllDrawers();
    }
  }

  function setLayoutMode(next: LayoutMode) {
    if (next !== 'desktop' && next !== 'tablet' && next !== 'phone') return;
    layoutMode.value = next;
  }

  function loadSceneData(data: Record<string, unknown>) {
    const ok = getRuntime().loadSceneData(data);
    if (ok) {
      closePropertyPanel();
      setStatusText('场景已加载');
    } else {
      setStatusText('场景加载失败');
    }
    return ok;
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
      const loaded = loadSceneData(resolved.data as Record<string, unknown>);
      if (!loaded) {
        return {
          ok: false as const,
          code: 'validation',
          error: 'Scene payload rejected by runtime.'
        };
      }
    }

    if (config.autoplay && !running.value) {
      toggleRunning();
    }

    return { ok: true as const };
  }

  function toggleRunning() {
    getRuntime().toggleRunning();
  }

  function startRunning() {
    getRuntime().start();
  }

  function stopRunning() {
    getRuntime().stop();
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
    if (!name || !name.trim()) return false;
    const sceneName = name.trim();
    const ok = getRuntime().saveScene(sceneName);
    if (ok) {
      setStatusText(`场景 "${sceneName}" 已保存`);
    } else {
      setStatusText(`场景 "${sceneName}" 保存失败`);
    }
    return ok;
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
      refreshSelectedPropertyPayload();
      return { ok: true as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : '属性应用失败';
      setStatusText(message);
      return { ok: false as const, error: message };
    }
  }

  return {
    toolbarGroups,
    hostMode,
    layoutMode,
    phoneDensityMode,
    classroomMode,
    activeDrawer,
    viewMode,
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
    variablesPanelOpen,
    variableDraft,
    markdownBoardOpen,
    markdownContent,
    markdownMode,
    markdownFontSize,
    timeStepLabel,
    showBoundaryMarginControl,
    demoButtonLabel,
    demoButtonTitle,
    mountRuntime,
    unmountRuntime,
    setHostMode,
    setLayoutMode,
    setPhoneDensityMode,
    togglePhoneDensityMode,
    setClassroomMode,
    toggleClassroomMode,
    loadSceneData,
    bootstrapFromEmbed,
    toggleRunning,
    startRunning,
    stopRunning,
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
    refreshSelectedPropertyPayload,
    openPropertyPanel,
    closePropertyPanel,
    applyPropertyValues,
    openVariablesPanel,
    closeVariablesPanel,
    applyVariables,
    toggleMarkdownBoard,
    closeMarkdownBoard,
    setMarkdownContent,
    setMarkdownMode,
    setMarkdownFontSize
  };
});
