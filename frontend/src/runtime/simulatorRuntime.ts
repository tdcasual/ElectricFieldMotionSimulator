import {
  DEMO_BASE_PIXELS_PER_UNIT,
  DEMO_MAX_ZOOM,
  DEMO_MIN_ZOOM,
  DEMO_ZOOM_STEP,
  DragDropManager,
  PerformanceMonitor,
  PhysicsEngine,
  Renderer,
  Scene,
  Serializer,
  ThemeManager,
  applyDemoZoomToScene,
  createResetBaselineController,
  getNextDemoZoom,
  getObjectGeometryScale,
  getObjectRealDimension,
  isFieldEnabled,
  isFieldVisible,
  isGeometryDimensionKey,
  parseExpressionInput,
  registry,
  setObjectDisplayDimension,
  setObjectRealDimension,
  syncObjectDisplayGeometry
} from '../engine/legacyBridge';
import { mountRuntimeBindings, unmountRuntimeBindings } from './runtimeLifecycle';
import { captureRuntimeDemoSession, clearRuntimeDemoSessionSnapshot, replaceRuntimeDemoSessionSnapshot, restoreRuntimeDemoSession, type RuntimeDemoSession } from './runtimeDemoSession';
import { buildPersistableSceneData, loadValidatedSceneData, type SceneMutationResult as RuntimeSceneMutationResult } from './runtimeSceneIo';
import { buildRuntimeSnapshot, type RuntimeSnapshot as RuntimeSnapshotData } from './runtimeSnapshotSync';

type AnyRecord = Record<string, unknown>;

type SchemaField = {
  key: string;
  label?: string;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  multiline?: boolean;
  rows?: number;
  options?: Array<{ value: unknown; label?: string }>;
  visibleWhen?: (values: AnyRecord) => boolean;
  enabledWhen?: (values: AnyRecord) => boolean;
  validator?: (value: unknown, values: AnyRecord) => string | null;
  bind?: {
    get?: (object: AnyRecord, context: AnyRecord) => unknown;
    set?: (object: AnyRecord, value: unknown, context: AnyRecord) => void;
  };
  sourceKey?: string;
  geometryRole?: 'real' | 'display';
};

type SchemaSection = {
  title?: string;
  group?: 'basic' | 'advanced';
  defaultCollapsed?: boolean;
  fields?: SchemaField[];
};

type RuntimeCallbacks = {
  onSnapshot?: (snapshot: RuntimeSnapshot) => void;
  onSelectionChange?: (selected: AnyRecord | null) => void;
  onPropertyRequest?: (selected: AnyRecord) => void;
  onPropertyHide?: () => void;
};

export type RuntimeSnapshot = RuntimeSnapshotData & {
  geometryInteraction: GeometryInteractionSnapshot | null;
};

export type GeometryInteractionSnapshot = {
  objectId: string | null;
  sourceKey: string;
  realValue: number;
  displayValue: number;
  objectScale: number;
};

export type PropertyPayload = {
  title: string;
  sections: SchemaSection[];
  values: AnyRecord;
};

export type SceneMutationResult = RuntimeSceneMutationResult;

type RenderRequest = {
  invalidateFields?: boolean;
  forceRender?: boolean;
  updateUI?: boolean;
  trackBaseline?: boolean;
  syncDemoSession?: boolean;
};

type RuntimeMode = 'normal' | 'demo';
type HostMode = 'edit' | 'view';
const DISPLAY_FIELD_SUFFIX = '__display';

function isRecord(value: unknown): value is AnyRecord {
  return !!value && typeof value === 'object';
}

function asFiniteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeFieldType(field: SchemaField): string {
  const type = typeof field.type === 'string' ? field.type : 'text';
  if (type === 'number' || type === 'text' || type === 'select' || type === 'checkbox' || type === 'expression') {
    return type;
  }
  return 'text';
}

function isGeometryEditableSchemaField(field: SchemaField): boolean {
  if (!field || field.type !== 'number') return false;
  if (!field.key || !isGeometryDimensionKey(field.key)) return false;
  if (field.bind && (typeof field.bind.get === 'function' || typeof field.bind.set === 'function')) {
    return false;
  }
  return true;
}

function displayFieldKeyFor(sourceKey: string): string {
  return `${sourceKey}${DISPLAY_FIELD_SUFFIX}`;
}


const EXPRESSION_SOURCE_NUMBER_RE = /^[+-]?(?:\d+\.\d*|\d+|\.\d+)(?:[eE][+-]?\d+)?$/;

function isDynamicExpressionSource(raw: unknown): raw is string {
  const text = String(raw ?? '').trim();
  if (!text) return false;
  return !EXPRESSION_SOURCE_NUMBER_RE.test(text);
}

export class SimulatorRuntime {
  readonly scene: Scene;
  readonly renderer: Renderer;
  readonly physicsEngine: PhysicsEngine;
  readonly performanceMonitor: PerformanceMonitor;
  readonly themeManager: ThemeManager;

  private readonly callbacks: RuntimeCallbacks;
  private readonly resetBaseline = createResetBaselineController();
  private readonly appAdapter: AnyRecord;
  private readonly dynamicExpressionFieldsByType = new Map<string, SchemaField[]>();

  private dragDropManager: DragDropManager | null = null;
  private mode: RuntimeMode = 'normal';
  private hostMode: HostMode = 'edit';
  private demoSession: RuntimeDemoSession | null = null;
  private readonly demoState = {
    zoom: 1,
    basePixelsPerMeter: DEMO_BASE_PIXELS_PER_UNIT,
    minZoom: DEMO_MIN_ZOOM,
    maxZoom: DEMO_MAX_ZOOM,
    step: DEMO_ZOOM_STEP
  };
  private running = false;
  private timeStep = 0.016;
  private statusText = '就绪';
  private isRestoringBaseline = false;
  private mounted = false;
  private rafId: number | null = null;
  private readonly handleResizeBound: () => void;
  private readonly handleShowPropertiesBound: (event: Event) => void;
  private readonly handleDemoWheelBound: (event: WheelEvent) => void;

  constructor(callbacks: RuntimeCallbacks = {}) {
    this.callbacks = callbacks;
    this.scene = new Scene();
    this.renderer = new Renderer();
    (this.scene as unknown as { renderer?: Renderer }).renderer = this.renderer;
    this.physicsEngine = new PhysicsEngine();
    this.performanceMonitor = new PerformanceMonitor();
    this.themeManager = new ThemeManager();

    this.handleResizeBound = () => this.handleResize();
    this.handleShowPropertiesBound = (event) => this.handleShowProperties(event);
    this.handleDemoWheelBound = (event) => this.handleDemoWheel(event);

    this.appAdapter = {
      scene: this.scene,
      requestRender: (options: RenderRequest = {}) => this.requestRender(options),
      updateUI: () => this.emitSnapshot(),
      setStatusText: (text: string) => this.setStatusText(text),
      propertyPanel: {
        hide: () => {
          this.callbacks.onPropertyHide?.();
        }
      }
    };
  }

  mount() {
    if (this.mounted) return;
    this.mounted = true;
    this.mode = 'normal';
    this.scene.settings.mode = this.mode;
    this.applyHostInteractionSettings();

    this.dragDropManager = mountRuntimeBindings({
      renderer: this.renderer,
      scene: this.scene,
      appAdapter: this.appAdapter,
      handleDemoWheel: this.handleDemoWheelBound,
      handleShowProperties: this.handleShowPropertiesBound,
      handleResize: this.handleResizeBound
    });
    this.syncViewportFromRenderer();

    this.setRunning(false);
    this.requestRender({ invalidateFields: true, forceRender: true, updateUI: true, trackBaseline: true });
    this.enterDemoMode();
  }

  unmount() {
    if (!this.mounted) return;
    this.stop();
    this.mounted = false;
    unmountRuntimeBindings({
      dragDropManager: this.dragDropManager,
      handleDemoWheel: this.handleDemoWheelBound,
      handleShowProperties: this.handleShowPropertiesBound,
      handleResize: this.handleResizeBound
    });
    this.dragDropManager = null;
  }

  getSnapshot(): RuntimeSnapshot {
    return buildRuntimeSnapshot({
      running: this.running,
      mode: this.mode,
      timeStep: this.timeStep,
      fps: this.performanceMonitor.getFPS(),
      objectCount: this.scene.getAllObjects().length,
      particleCount: this.scene.particles.length,
      selectedObject: this.scene.selectedObject as { id?: unknown } | null,
      statusText: this.statusText,
      geometryInteraction: this.readGeometryInteractionSnapshot(),
      frameStats: this.performanceMonitor.getFrameStats()
    });
  }

  setStatusText(text: string) {
    this.statusText = String(text || '就绪');
    this.emitSnapshot();
  }

  setTimeStep(next: number) {
    if (!Number.isFinite(next) || next <= 0) return;
    this.timeStep = next;
    this.emitSnapshot();
  }

  isDemoMode() {
    return this.mode === 'demo';
  }

  setHostMode(next: HostMode) {
    const normalized = next === 'view' ? 'view' : 'edit';
    const changed = this.hostMode !== normalized;
    this.hostMode = normalized;
    this.applyHostInteractionSettings();

    if (this.hostMode === 'view') {
      this.scene.selectedObject = null;
      if (this.scene.interaction && typeof this.scene.interaction === 'object') {
        this.scene.interaction.tangencyHint = null;
        this.scene.interaction.geometryOverlay = null;
      }
      this.callbacks.onPropertyHide?.();
    }

    if (changed || this.hostMode === 'view') {
      this.requestRender({ invalidateFields: true, forceRender: true, updateUI: true, trackBaseline: false });
    }
  }

  toggleDemoMode() {
    if (this.isDemoMode()) {
      return this.exitDemoMode();
    }
    return this.enterDemoMode();
  }

  enterDemoMode() {
    if (this.isDemoMode()) return true;

    const snapshot = this.scene.serialize();
    if (!isRecord(snapshot)) return false;

    this.demoSession = captureRuntimeDemoSession({
      snapshot,
      wasRunning: this.running,
      selectedObjectId: (this.scene.selectedObject as { id?: unknown } | null)?.id
        ? String((this.scene.selectedObject as { id?: unknown }).id)
        : null
    });

    this.stop();
    this.mode = 'demo';
    this.demoState.zoom = 1;
    this.scene.clear();
    this.scene.settings.boundaryMargin = this.demoState.basePixelsPerMeter;
    this.applyModeSettings();
    this.performanceMonitor.reset();
    this.callbacks.onPropertyHide?.();
    this.requestRender({ invalidateFields: true, forceRender: true, updateUI: true, trackBaseline: false });
    this.setStatusText('已进入演示模式：数值默认 1、角度默认 0，滚轮可按鼠标位置缩放');
    return true;
  }

  exitDemoMode() {
    if (!this.isDemoMode()) return false;

    const session = this.demoSession;
    this.stop();
    this.mode = 'normal';
    this.demoState.zoom = 1;

    restoreRuntimeDemoSession({
      scene: this.scene,
      session,
      restoreSelectedObjectById: (selectedObjectId) => this.restoreSelectedObjectById(selectedObjectId)
    });

    this.scene.settings.mode = 'normal';
    this.demoSession = null;
    this.performanceMonitor.reset();
    this.callbacks.onPropertyHide?.();
    this.requestRender({ invalidateFields: true, forceRender: true, updateUI: true, trackBaseline: true });
    this.setRunning(!!session?.wasRunning);
    this.setStatusText('已退出演示模式并恢复切换前场景');
    return true;
  }

  toggleRunning() {
    this.setRunning(!this.running);
  }

  start() {
    this.setRunning(true);
  }

  stop() {
    this.setRunning(false);
  }

  setRunning(next: boolean) {
    const running = !!next;
    if (this.running === running) return;
    this.running = running;
    this.scene.isPaused = !running;
    if (running) {
      this.loop();
    } else if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.emitSnapshot();
  }

  requestRender(options: RenderRequest = {}) {
    const {
      invalidateFields = false,
      forceRender = false,
      updateUI = true,
      trackBaseline = true,
      syncDemoSession = trackBaseline
    } = options;

    this.refreshDynamicExpressionBindings();

    if (invalidateFields) {
      this.renderer.invalidateFields();
    }
    if (forceRender || this.scene.isPaused) {
      this.renderer.render(this.scene);
    }
    if (updateUI) {
      this.emitSnapshot();
    }
    if (syncDemoSession) {
      this.persistCurrentDemoSceneSnapshot();
    }
    if (trackBaseline) {
      this.recordResetBaseline();
    }
  }

  handleResize() {
    this.renderer.resize();
    this.syncViewportFromRenderer();
    this.requestRender({ forceRender: true, updateUI: true, trackBaseline: false });
  }

  createObjectAtCenter(type: string) {
    if (!type) return;
    const bounds = this.scene.getWorldViewportBounds(0);
    const x = (bounds.minX + bounds.maxX) / 2;
    const y = (bounds.minY + bounds.maxY) / 2;
    if (this.dragDropManager) {
      this.dragDropManager.createObject(type, x, y);
      return;
    }
    const object = registry.create(type, { x, y });
    this.scene.addObject(object);
    this.scene.selectedObject = object as never;
    this.requestRender({ invalidateFields: true, updateUI: true });
  }

  duplicateSelected() {
    if (!this.scene.selectedObject) return;
    this.scene.duplicateObject(this.scene.selectedObject);
    this.requestRender({ invalidateFields: true, updateUI: true });
  }

  private restoreSelectedObjectById(selectedObjectId: string | null) {
    if (!selectedObjectId) {
      this.scene.selectedObject = null;
      return;
    }
    const next = this.scene.objects.find((object) => String((object as { id?: unknown })?.id ?? '') === selectedObjectId) ?? null;
    this.scene.selectedObject = (next as never) ?? null;
  }

  deleteSelected() {
    if (!this.scene.selectedObject) return;
    this.scene.removeObject(this.scene.selectedObject);
    this.scene.selectedObject = null;
    this.callbacks.onPropertyHide?.();
    this.requestRender({ invalidateFields: true, updateUI: true });
  }

  clearScene() {
    this.scene.clear();
    this.applyModeSettings();
    if (this.isDemoMode()) {
      this.demoSession = clearRuntimeDemoSessionSnapshot(this.demoSession);
    }
    this.performanceMonitor.reset();
    this.callbacks.onPropertyHide?.();
    this.requestRender({ invalidateFields: true, updateUI: true, syncDemoSession: false });
  }

  resetScene() {
    const snapshot = this.resetBaseline.restoreBaseline();
    if (!snapshot || !isRecord(snapshot)) return false;
    this.isRestoringBaseline = true;
    try {
      this.stop();
      this.scene.clear();
      this.scene.loadFromData(snapshot);
      this.applyModeSettings();
      this.performanceMonitor.reset();
      this.callbacks.onPropertyHide?.();
      this.requestRender({
        invalidateFields: true,
        forceRender: true,
        updateUI: true,
        trackBaseline: false,
        syncDemoSession: true
      });
      this.resetBaseline.setBaseline(snapshot);
      return true;
    } finally {
      this.isRestoringBaseline = false;
    }
  }

  persistDemoSceneSettings(settingsPatch: AnyRecord) {
    if (!this.isDemoMode() || !this.demoSession || !isRecord(settingsPatch)) return;
    const snapshot = this.demoSession.snapshot;
    const snapshotSettings = isRecord(snapshot.settings) ? snapshot.settings : {};
    this.demoSession = replaceRuntimeDemoSessionSnapshot({
      session: this.demoSession,
      snapshot: {
        ...snapshot,
        settings: {
          ...snapshotSettings,
          ...settingsPatch
        }
      },
      selectedObjectId: this.demoSession.selectedObjectId
    });
  }

  private persistCurrentDemoSceneSnapshot() {
    if (!this.isDemoMode() || !this.demoSession) return;
    const snapshot = this.scene.serialize();
    if (!isRecord(snapshot)) return;

    const persistedSnapshot = this.demoSession.snapshot;
    const persistedSettings = isRecord(persistedSnapshot.settings) ? persistedSnapshot.settings : {};
    const liveSettings = isRecord(snapshot.settings) ? snapshot.settings : {};

    this.demoSession = replaceRuntimeDemoSessionSnapshot({
      session: this.demoSession,
      snapshot: {
        ...snapshot,
        settings: {
          ...liveSettings,
          mode: persistedSettings.mode ?? liveSettings.mode,
          hostMode: persistedSettings.hostMode ?? liveSettings.hostMode,
          interactionLocked: persistedSettings.interactionLocked ?? liveSettings.interactionLocked,
          pixelsPerMeter: persistedSettings.pixelsPerMeter ?? liveSettings.pixelsPerMeter,
          gravity: persistedSettings.gravity ?? liveSettings.gravity
        }
      },
      selectedObjectId: (this.scene.selectedObject as { id?: unknown } | null)?.id
        ? String((this.scene.selectedObject as { id?: unknown }).id)
        : null
    });
  }

  private buildPersistableSceneData():
    | { ok: true; data: AnyRecord }
    | { ok: false; error: string } {
    return buildPersistableSceneData({
      serializeScene: () => this.scene.serialize(),
      validateSceneData: (data) => Serializer.validateSceneData(data)
    });
  }

  saveScene(name: string): SceneMutationResult {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { ok: false, error: '场景名称不能为空' };
    }

    const sceneData = this.buildPersistableSceneData();
    if (!sceneData.ok) {
      return sceneData;
    }

    const ok = Serializer.saveSceneData(sceneData.data, trimmedName);
    if (!ok) {
      return { ok: false, error: `场景 "${trimmedName}" 保存失败` };
    }
    return { ok: true };
  }

  loadScene(name: string): SceneMutationResult {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { ok: false, error: '场景名称不能为空' };
    }

    const data = Serializer.loadScene(trimmedName);
    if (!data) {
      return { ok: false, error: `场景 "${trimmedName}" 不存在` };
    }

    return this.loadSceneData(data);
  }

  loadSceneData(data: unknown): SceneMutationResult {
    const result = loadValidatedSceneData({
      data,
      validateSceneData: (sceneData) => Serializer.validateSceneData(sceneData),
      clearScene: () => this.scene.clear(),
      loadSceneData: (sceneData) => this.scene.loadFromData(sceneData),
      applyModeSettings: () => this.applyModeSettings(),
      onPropertyHide: () => this.callbacks.onPropertyHide?.(),
      requestRender: () => {
        this.performanceMonitor.reset();
        this.requestRender({
          invalidateFields: true,
          forceRender: true,
          updateUI: true,
          trackBaseline: true,
          syncDemoSession: false
        });
      }
    });

    if (result.ok && this.isDemoMode() && isRecord(data)) {
      this.demoSession = replaceRuntimeDemoSessionSnapshot({
        session: this.demoSession,
        snapshot: data,
        selectedObjectId: (this.scene.selectedObject as { id?: unknown } | null)?.id
          ? String((this.scene.selectedObject as { id?: unknown }).id)
          : null
      });
    }

    return result;
  }

  exportScene(): SceneMutationResult {
    const sceneData = this.buildPersistableSceneData();
    if (!sceneData.ok) {
      return sceneData;
    }

    Serializer.exportToFile(
      { serialize: () => sceneData.data },
      `electric-field-scene-${Date.now()}.json`
    );
    return { ok: true };
  }

  importScene(file: File): Promise<SceneMutationResult> {
    return new Promise((resolve) => {
      Serializer.importFromFile(file, (error: Error | null, data: unknown) => {
        if (error) {
          resolve({ ok: false, error: error.message || '导入失败' });
          return;
        }
        if (!isRecord(data)) {
          resolve({ ok: false, error: '导入文件不是有效场景对象' });
          return;
        }
        resolve(this.loadSceneData(data));
      });
    });
  }

  toggleTheme() {
    this.themeManager.toggle();
    this.requestRender({ invalidateFields: true, updateUI: true, trackBaseline: false });
    return this.themeManager.getCurrentTheme();
  }

  getSelectedObject() {
    return this.scene.selectedObject as AnyRecord | null;
  }

  selectObjectByIndex(index: number): { ok: true; id: string | null } | { ok: false; error: string } {
    const normalizedIndex = Math.trunc(Number(index));
    if (!Number.isFinite(normalizedIndex) || normalizedIndex < 0) {
      return { ok: false, error: '对象索引无效' };
    }

    const objects = Array.isArray(this.scene.objects) ? this.scene.objects : [];
    const object = objects[normalizedIndex];
    if (!object || typeof object !== 'object') {
      return { ok: false, error: '对象不存在' };
    }

    this.scene.selectedObject = object as never;
    this.requestRender({ invalidateFields: true, updateUI: true, trackBaseline: false });
    return {
      ok: true,
      id: (object as { id?: unknown }).id == null ? null : String((object as { id?: unknown }).id)
    };
  }

  buildPropertyPayload(): PropertyPayload | null {
    const object = this.getSelectedObject();
    if (!object) return null;

    const entry = registry.get(String(object.type || ''));
    if (!entry || typeof entry.schema !== 'function') return null;
    const sections = this.buildPropertySectionsForUI((entry.schema() as SchemaSection[]) || []);
    return {
      title: String(entry.label || object.type || '属性'),
      sections,
      values: this.buildPropertyValues(object, sections)
    };
  }

  applySelectedProperties(nextValues: AnyRecord) {
    const object = this.getSelectedObject();
    if (!object) return;

    const entry = registry.get(String(object.type || ''));
    if (!entry || typeof entry.schema !== 'function') return;

    const sections = this.buildPropertySectionsForUI((entry.schema() as SchemaSection[]) || []);
    const errors: string[] = [];
    const context = this.buildBindContext();
    const currentValues = this.buildPropertyValues(object, sections);
    const incomingValues = isRecord(nextValues) ? nextValues : {};
    const mergedValues = { ...currentValues, ...incomingValues };
    const changedFieldKeys = this.computeChangedFieldKeys(sections, currentValues, mergedValues);
    let geometryChanged = false;
    const requestedDisplayScales: Array<{ key: string; label: string; scale: number }> = [];

    for (const section of sections) {
      const fields = Array.isArray(section?.fields) ? section.fields : [];
      for (const field of fields) {
        if (!field || !field.key) continue;
        if (!isFieldVisible(field, mergedValues)) continue;
        if (!isFieldEnabled(field, mergedValues)) continue;

        const raw = mergedValues[field.key];
        if (typeof field.validator === 'function') {
          const message = field.validator(raw, mergedValues);
          if (message) {
            errors.push(`${field.label || field.key}: ${message}`);
            continue;
          }
        }

        if (field.geometryRole === 'real' && field.sourceKey) {
          if (!changedFieldKeys.has(field.key)) continue;
          const rawNumber = Number(raw);
          if (!setObjectRealDimension(object, field.sourceKey, rawNumber, this.scene)) {
            errors.push(`${field.label || field.key}: 数值无效`);
            continue;
          }
          geometryChanged = true;
          continue;
        }

        if (field.geometryRole === 'display' && field.sourceKey) {
          if (!changedFieldKeys.has(field.key)) continue;
          const rawNumber = Number(raw);
          const realValue = getObjectRealDimension(object, field.sourceKey, this.scene);
          const normalizedRealValue = realValue == null ? null : Number(realValue);
          const sceneScale = Number(context.pixelsPerMeter);
          if (
            !Number.isFinite(rawNumber) || rawNumber <= 0 ||
            normalizedRealValue == null || !Number.isFinite(normalizedRealValue) || normalizedRealValue <= 0 ||
            !Number.isFinite(sceneScale) || sceneScale <= 0
          ) {
            errors.push(`${field.label || field.key}: 显示值无效`);
            continue;
          }
          const nextScale = rawNumber / (normalizedRealValue * sceneScale);
          if (!Number.isFinite(nextScale) || nextScale <= 0) {
            errors.push(`${field.label || field.key}: 缩放无效`);
            continue;
          }
          requestedDisplayScales.push({
            key: field.key,
            label: String(field.label || field.key),
            scale: nextScale
          });
          continue;
        }

        if (field.bind && typeof field.bind.set === 'function') {
          if (normalizeFieldType(field) === 'expression') {
            const parsed = parseExpressionInput(raw, this.scene) as { ok: boolean; error?: string };
            if (!parsed?.ok) {
              errors.push(`${field.label || field.key}: ${parsed?.error || '表达式无效'}`);
              continue;
            }
            field.bind.set(object, parsed, context);
            continue;
          }
          field.bind.set(object, this.coerceFieldValue(field, raw), context);
          continue;
        }

        const coerced = this.coerceFieldValue(field, raw);
        if (normalizeFieldType(field) === 'number' && !Number.isFinite(coerced as number)) {
          errors.push(`${field.label || field.key}: 数值无效`);
          continue;
        }
        object[field.key] = coerced;

        if (field.key === 'showTrajectory' && coerced === false && typeof object.clearTrajectory === 'function') {
          object.clearTrajectory();
        }

        if (field.key === 'customExpression' && typeof object.compileCustomExpression === 'function') {
          object.compileCustomExpression();
        }
      }
    }

    if (requestedDisplayScales.length > 0) {
      const baseScale = requestedDisplayScales[0].scale;
      const conflict = requestedDisplayScales.find((item) => Math.abs(item.scale - baseScale) > 1e-9);
      if (conflict) {
        errors.push(`显示尺寸存在冲突：${requestedDisplayScales.map((item) => item.label).join('、')} 推导出的缩放不一致`);
      } else {
        object.__geometryObjectScale = baseScale;
        geometryChanged = true;
      }
    }

    if (errors.length) {
      throw new Error(errors.join('\n'));
    }

    if (object.type === 'electron-gun') {
      object._emitAccumulator = 0;
    }
    if (typeof object.resetRuntime === 'function') {
      object.resetRuntime();
    }
    if (geometryChanged) {
      syncObjectDisplayGeometry(object, this.scene);
    }

    const invalidateFields = entry.rendererKey !== 'particle';
    this.requestRender({ invalidateFields, updateUI: true, trackBaseline: true });
  }

  private loop() {
    if (!this.running) return;
    this.performanceMonitor.startFrame();
    this.scene.time += this.timeStep;
    this.refreshDynamicExpressionBindings();
    this.physicsEngine.update(this.scene, this.timeStep);
    this.renderer.render(this.scene);
    this.performanceMonitor.endFrame();
    this.emitSnapshot();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private emitSnapshot() {
    this.callbacks.onSelectionChange?.(this.getSelectedObject());
    this.callbacks.onSnapshot?.(this.getSnapshot());
  }

  private readGeometryInteractionSnapshot(): GeometryInteractionSnapshot | null {
    const interaction = this.scene.interaction as Record<string, unknown> | null | undefined;
    const overlay = interaction?.geometryOverlay as Record<string, unknown> | null | undefined;
    if (!overlay || typeof overlay !== 'object') return null;

    const sourceKey = String(overlay.sourceKey ?? '').trim();
    const realValue = asFiniteNumber(overlay.realValue);
    const displayValue = asFiniteNumber(overlay.displayValue);
    const objectScale = asFiniteNumber(overlay.objectScale);
    if (!sourceKey) return null;
    if (realValue == null || displayValue == null || objectScale == null) return null;

    return {
      objectId: overlay.objectId == null ? null : String(overlay.objectId),
      sourceKey,
      realValue,
      displayValue,
      objectScale
    };
  }

  private syncViewportFromRenderer() {
    const width = this.renderer.width ?? 0;
    const height = this.renderer.height ?? 0;
    this.scene.setViewport(width, height);
  }

  private handleShowProperties(event: Event) {
    const customEvent = event as CustomEvent<{ object?: unknown }>;
    const object = customEvent.detail?.object;
    if (!isRecord(object)) return;
    this.scene.selectedObject = object as never;
    this.callbacks.onPropertyRequest?.(object);
    this.requestRender({ invalidateFields: true, updateUI: true, trackBaseline: false });
  }

  private recordResetBaseline() {
    if (this.running || this.isRestoringBaseline) return;
    this.resetBaseline.setBaseline(this.scene.serialize());
  }

  private applyModeSettings() {
    this.scene.settings.mode = this.mode;
    this.applyHostInteractionSettings();
    if (this.mode !== 'demo') return;
    this.scene.settings.gravity = 0;
    const ppm = this.demoState.basePixelsPerMeter * this.demoState.zoom;
    if (Number.isFinite(ppm) && ppm > 0) {
      this.scene.settings.pixelsPerMeter = ppm;
    }
    if (!Number.isFinite(this.scene.settings.boundaryMargin) || this.scene.settings.boundaryMargin <= 0) {
      this.scene.settings.boundaryMargin = this.demoState.basePixelsPerMeter;
    }
  }

  private applyHostInteractionSettings() {
    this.scene.settings.hostMode = this.hostMode;
    this.scene.settings.interactionLocked = this.hostMode === 'view';
  }

  private handleDemoWheel(event: WheelEvent) {
    if (!this.isDemoMode()) return;
    event.preventDefault();

    const canvas = this.renderer.particleCanvas;
    if (!(canvas instanceof HTMLCanvasElement)) return;

    const rect = canvas.getBoundingClientRect();
    const anchorScreenX = event.clientX - rect.left;
    const anchorScreenY = event.clientY - rect.top;
    const anchor = this.scene.toWorldPoint(anchorScreenX, anchorScreenY);

    const nextZoom = getNextDemoZoom(this.demoState.zoom, event.deltaY, {
      step: this.demoState.step,
      min: this.demoState.minZoom,
      max: this.demoState.maxZoom
    });

    if (Math.abs(nextZoom - this.demoState.zoom) < 1e-12) return;

    const changed = applyDemoZoomToScene(this.scene, {
      newPixelsPerMeter: this.demoState.basePixelsPerMeter * nextZoom,
      anchorX: anchor.x,
      anchorY: anchor.y
    });

    this.demoState.zoom = nextZoom;
    this.scene.settings.gravity = 0;

    if (!changed) return;
    this.requestRender({ invalidateFields: true, forceRender: true, updateUI: true, trackBaseline: false });
  }

  private refreshDynamicExpressionBindings() {
    const objects = Array.isArray(this.scene.objects) ? this.scene.objects : [];
    if (objects.length === 0) return;

    const context = this.buildBindContext();
    for (const object of objects) {
      const fields = this.getDynamicExpressionFieldsForType(String(object?.type || ''));
      if (fields.length === 0) continue;
      for (const field of fields) {
        const raw = field.bind?.get?.(object, context);
        if (!isDynamicExpressionSource(raw)) continue;
        const parsed = parseExpressionInput(raw, this.scene) as {
          ok: boolean;
          empty?: boolean;
          error?: string;
          expr?: string | null;
          value?: number | null;
        };
        if (!parsed?.ok || parsed.empty) continue;
        field.bind?.set?.(object, parsed, context);
      }
    }
  }

  private getDynamicExpressionFieldsForType(type: string): SchemaField[] {
    if (!type) return [];
    const cached = this.dynamicExpressionFieldsByType.get(type);
    if (cached) return cached;

    const entry = registry.get(type);
    if (!entry || typeof entry.schema !== 'function') {
      this.dynamicExpressionFieldsByType.set(type, []);
      return [];
    }

    const fields: SchemaField[] = [];
    const sections = (entry.schema() as SchemaSection[]) || [];
    for (const section of sections) {
      for (const field of section?.fields ?? []) {
        if (!field || normalizeFieldType(field) !== 'expression') continue;
        if (!field.bind || typeof field.bind.get !== 'function' || typeof field.bind.set !== 'function') continue;
        fields.push(field);
      }
    }
    this.dynamicExpressionFieldsByType.set(type, fields);
    return fields;
  }

  private buildBindContext(): AnyRecord {
    const ppm = Number.isFinite(this.scene.settings?.pixelsPerMeter) && this.scene.settings.pixelsPerMeter > 0
      ? this.scene.settings.pixelsPerMeter
      : 1;
    return {
      scene: this.scene,
      pixelsPerMeter: ppm
    };
  }

  private buildPropertySectionsForUI(sections: SchemaSection[]): SchemaSection[] {
    return sections.map((section) => {
      const fields = Array.isArray(section?.fields) ? section.fields : [];
      const mappedFields: SchemaField[] = [];
      for (const field of fields) {
        if (!field || !field.key) continue;
        if (!isGeometryEditableSchemaField(field)) {
          mappedFields.push(field);
          continue;
        }

        const baseLabel = String(field.label || field.key);
        mappedFields.push({
          ...field,
          label: `${baseLabel}（真实）`,
          sourceKey: field.key,
          geometryRole: 'real'
        });
        mappedFields.push({
          ...field,
          key: displayFieldKeyFor(field.key),
          label: `${baseLabel}（显示）`,
          min: undefined,
          max: undefined,
          bind: undefined,
          validator: undefined,
          sourceKey: field.key,
          geometryRole: 'display'
        });
      }
      return {
        ...section,
        fields: mappedFields
      };
    });
  }

  private computeChangedFieldKeys(sections: SchemaSection[], currentValues: AnyRecord, mergedValues: AnyRecord): Set<string> {
    const changed = new Set<string>();
    for (const section of sections) {
      const fields = Array.isArray(section?.fields) ? section.fields : [];
      for (const field of fields) {
        if (!field?.key) continue;
        if (!Object.prototype.hasOwnProperty.call(mergedValues, field.key)) continue;
        const next = mergedValues[field.key];
        const prev = currentValues[field.key];
        const type = normalizeFieldType(field);
        if (type === 'number') {
          const prevNum = Number(prev);
          const nextNum = Number(next);
          if (!Number.isFinite(prevNum) || !Number.isFinite(nextNum) || Math.abs(prevNum - nextNum) > 1e-9) {
            changed.add(field.key);
          }
          continue;
        }
        if (type === 'checkbox') {
          if (!!prev !== !!next) changed.add(field.key);
          continue;
        }
        if (String(prev ?? '') !== String(next ?? '')) {
          changed.add(field.key);
        }
      }
    }
    return changed;
  }

  private buildPropertyValues(object: AnyRecord, sections: SchemaSection[]): AnyRecord {
    const values: AnyRecord = {};
    const context = this.buildBindContext();
    syncObjectDisplayGeometry(object, this.scene);
    for (const section of sections) {
      const fields = Array.isArray(section?.fields) ? section.fields : [];
      for (const field of fields) {
        if (!field || !field.key) continue;
        let value: unknown;
        if (field.geometryRole === 'real' && field.sourceKey) {
          value = getObjectRealDimension(object, field.sourceKey, this.scene);
        } else if (field.geometryRole === 'display' && field.sourceKey) {
          value = object[field.sourceKey];
        } else if (field.bind && typeof field.bind.get === 'function') {
          value = field.bind.get(object, context);
        } else {
          value = object[field.key];
        }
        values[field.key] = value;
      }
    }
    values.__geometryObjectScale = getObjectGeometryScale(object);
    return values;
  }

  private coerceFieldValue(field: SchemaField, raw: unknown): unknown {
    const type = normalizeFieldType(field);
    if (type === 'checkbox') return !!raw;
    if (type === 'number') {
      return Number(raw);
    }
    if (raw == null) return '';
    return String(raw);
  }
}
