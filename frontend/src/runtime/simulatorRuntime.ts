import { Scene } from '../../../js/core/Scene.js';
import { Renderer } from '../../../js/core/Renderer.js';
import { PhysicsEngine } from '../../../js/core/PhysicsEngine.js';
import { DragDropManager } from '../../../js/interactions/DragDropManager.js';
import { registry } from '../../../js/core/registerObjects.js';
import { Serializer } from '../../../js/utils/Serializer.js';
import { ThemeManager } from '../../../js/utils/ThemeManager.js';
import { PerformanceMonitor } from '../../../js/utils/PerformanceMonitor.js';
import { createResetBaselineController } from '../../../js/utils/ResetBaseline.js';
import { isFieldEnabled, isFieldVisible, parseExpressionInput } from '../../../js/ui/SchemaForm.js';
import {
  DEMO_BASE_PIXELS_PER_UNIT,
  DEMO_MAX_ZOOM,
  DEMO_MIN_ZOOM,
  DEMO_ZOOM_STEP,
  applyDemoZoomToScene,
  getNextDemoZoom
} from '../../../js/modes/DemoMode.js';

type AnyRecord = Record<string, unknown>;

export type SchemaField = {
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
};

export type SchemaSection = {
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

export type RuntimeSnapshot = {
  running: boolean;
  mode: 'normal' | 'demo';
  timeStep: number;
  fps: number;
  objectCount: number;
  particleCount: number;
  selectedObjectId: string | null;
  statusText: string;
};

export type PropertyPayload = {
  title: string;
  sections: SchemaSection[];
  values: AnyRecord;
};

type RenderRequest = {
  invalidateFields?: boolean;
  forceRender?: boolean;
  updateUI?: boolean;
  trackBaseline?: boolean;
};

type RuntimeMode = 'normal' | 'demo';
type HostMode = 'edit' | 'view';

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

export class SimulatorRuntime {
  readonly scene: Scene;
  readonly renderer: Renderer;
  readonly physicsEngine: PhysicsEngine;
  readonly performanceMonitor: PerformanceMonitor;
  readonly themeManager: ThemeManager;

  private readonly callbacks: RuntimeCallbacks;
  private readonly resetBaseline = createResetBaselineController();
  private readonly appAdapter: AnyRecord;

  private dragDropManager: DragDropManager | null = null;
  private mode: RuntimeMode = 'normal';
  private hostMode: HostMode = 'edit';
  private demoSession: { snapshot: AnyRecord; wasRunning: boolean } | null = null;
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

    this.renderer.init();
    this.syncViewportFromRenderer();

    const particleCanvas = document.getElementById('particle-canvas');
    if (particleCanvas instanceof HTMLCanvasElement) {
      this.dragDropManager = new DragDropManager(this.scene, this.renderer, {
        canvas: particleCanvas,
        appAdapter: this.appAdapter
      });
      particleCanvas.addEventListener('wheel', this.handleDemoWheelBound, { passive: false });
    }

    document.addEventListener('show-properties', this.handleShowPropertiesBound);
    window.addEventListener('resize', this.handleResizeBound);

    this.setRunning(false);
    this.requestRender({ invalidateFields: true, forceRender: true, updateUI: true, trackBaseline: true });
    this.enterDemoMode();
  }

  unmount() {
    if (!this.mounted) return;
    this.stop();
    this.mounted = false;
    this.dragDropManager?.dispose?.();
    this.dragDropManager = null;
    const particleCanvas = document.getElementById('particle-canvas');
    if (particleCanvas instanceof HTMLCanvasElement) {
      particleCanvas.removeEventListener('wheel', this.handleDemoWheelBound);
    }
    window.removeEventListener('resize', this.handleResizeBound);
    document.removeEventListener('show-properties', this.handleShowPropertiesBound);
  }

  getSnapshot(): RuntimeSnapshot {
    return {
      running: this.running,
      mode: this.mode,
      timeStep: this.timeStep,
      fps: this.performanceMonitor.getFPS(),
      objectCount: this.scene.getAllObjects().length,
      particleCount: this.scene.particles.length,
      selectedObjectId: (this.scene.selectedObject as { id?: unknown } | null)?.id
        ? String((this.scene.selectedObject as { id?: unknown }).id)
        : null,
      statusText: this.statusText
    };
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

    this.demoSession = {
      snapshot: JSON.parse(JSON.stringify(snapshot)) as AnyRecord,
      wasRunning: this.running
    };

    this.stop();
    this.mode = 'demo';
    this.demoState.zoom = 1;
    this.scene.clear();
    this.scene.settings.boundaryMargin = this.demoState.basePixelsPerMeter;
    this.applyModeSettings();
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

    if (isRecord(session?.snapshot)) {
      this.scene.clear();
      this.scene.loadFromData(session.snapshot);
    }

    this.scene.settings.mode = 'normal';
    this.demoSession = null;
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
      trackBaseline = true
    } = options;

    if (invalidateFields) {
      this.renderer.invalidateFields();
    }
    if (forceRender || this.scene.isPaused) {
      this.renderer.render(this.scene);
    }
    if (updateUI) {
      this.emitSnapshot();
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
    this.requestRender({ invalidateFields: true, updateUI: true });
  }

  duplicateSelected() {
    if (!this.scene.selectedObject) return;
    this.scene.duplicateObject(this.scene.selectedObject);
    this.requestRender({ invalidateFields: true, updateUI: true });
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
    this.callbacks.onPropertyHide?.();
    this.requestRender({ invalidateFields: true, updateUI: true });
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
      this.callbacks.onPropertyHide?.();
      this.requestRender({ invalidateFields: true, forceRender: true, updateUI: true, trackBaseline: false });
      this.resetBaseline.setBaseline(snapshot);
      return true;
    } finally {
      this.isRestoringBaseline = false;
    }
  }

  saveScene(name: string) {
    if (!name || !name.trim()) return false;
    return Serializer.saveSceneData(this.scene.serialize(), name.trim());
  }

  loadScene(name: string) {
    if (!name || !name.trim()) return false;
    const data = Serializer.loadScene(name.trim());
    if (!data) return false;
    this.scene.clear();
    this.scene.loadFromData(data);
    this.applyModeSettings();
    this.callbacks.onPropertyHide?.();
    this.requestRender({ invalidateFields: true, forceRender: true, updateUI: true, trackBaseline: true });
    return true;
  }

  loadSceneData(data: unknown) {
    if (!isRecord(data)) return false;
    const validation = Serializer.validateSceneData(data);
    if (!validation.valid) return false;
    this.scene.clear();
    this.scene.loadFromData(data);
    this.applyModeSettings();
    this.callbacks.onPropertyHide?.();
    this.requestRender({ invalidateFields: true, forceRender: true, updateUI: true, trackBaseline: true });
    return true;
  }

  exportScene() {
    Serializer.exportToFile(this.scene, `electric-field-scene-${Date.now()}.json`);
  }

  importScene(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      Serializer.importFromFile(file, (error: Error | null, data: unknown) => {
        if (error || !isRecord(data)) {
          resolve(false);
          return;
        }
        const validation = Serializer.validateSceneData(data);
        if (!validation.valid) {
          resolve(false);
          return;
        }
        this.scene.clear();
        this.scene.loadFromData(data);
        this.applyModeSettings();
        this.callbacks.onPropertyHide?.();
        this.requestRender({ invalidateFields: true, forceRender: true, updateUI: true, trackBaseline: true });
        resolve(true);
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

  buildPropertyPayload(): PropertyPayload | null {
    const object = this.getSelectedObject();
    if (!object) return null;

    const entry = registry.get(String(object.type || ''));
    if (!entry || typeof entry.schema !== 'function') return null;
    const sections = (entry.schema() as SchemaSection[]) || [];
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

    const sections = (entry.schema() as SchemaSection[]) || [];
    const errors: string[] = [];
    const context = this.buildBindContext();
    const currentValues = this.buildPropertyValues(object, sections);
    const mergedValues = { ...currentValues, ...(isRecord(nextValues) ? nextValues : {}) };

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

        if (field.key === 'customExpression' && typeof object.compileCustomExpression === 'function') {
          object.compileCustomExpression();
        }
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

    const invalidateFields = entry.rendererKey !== 'particle';
    this.requestRender({ invalidateFields, updateUI: true, trackBaseline: true });
  }

  private loop() {
    if (!this.running) return;
    this.performanceMonitor.startFrame();
    this.scene.time += this.timeStep;
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

  private buildBindContext(): AnyRecord {
    const ppm = Number.isFinite(this.scene.settings?.pixelsPerMeter) && this.scene.settings.pixelsPerMeter > 0
      ? this.scene.settings.pixelsPerMeter
      : 1;
    return {
      scene: this.scene,
      pixelsPerMeter: ppm
    };
  }

  private buildPropertyValues(object: AnyRecord, sections: SchemaSection[]): AnyRecord {
    const values: AnyRecord = {};
    const context = this.buildBindContext();
    for (const section of sections) {
      const fields = Array.isArray(section?.fields) ? section.fields : [];
      for (const field of fields) {
        if (!field || !field.key) continue;
        let value: unknown;
        if (field.bind && typeof field.bind.get === 'function') {
          value = field.bind.get(object, context);
        } else {
          value = object[field.key];
        }
        values[field.key] = value;
      }
    }
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
