type LegacyRecord = any;

declare module '*js/core/Scene.js' {
  export class Scene {
    objects: LegacyRecord[];
    electricFields: LegacyRecord[];
    magneticFields: LegacyRecord[];
    disappearZones: LegacyRecord[];
    emitters: LegacyRecord[];
    particles: LegacyRecord[];
    selectedObject: LegacyRecord | null;
    isPaused: boolean;
    time: number;
    viewport: { width: number; height: number };
    camera: { offsetX: number; offsetY: number };
    interaction: LegacyRecord;
    settings: LegacyRecord;
    variables: LegacyRecord;
    addObject(object: LegacyRecord): LegacyRecord | null;
    removeObject(object: LegacyRecord): this;
    getAllObjects(): LegacyRecord[];
    findObjectAt(x: number, y: number): LegacyRecord | null;
    clear(): void;
    duplicateObject(object: LegacyRecord): LegacyRecord;
    serialize(): LegacyRecord;
    loadFromData(data: LegacyRecord): void;
    setViewport(width: number, height: number): void;
    setCamera(offsetX?: number, offsetY?: number): void;
    toWorldPoint(screenX: number, screenY: number): { x: number; y: number };
    toScreenPoint(worldX: number, worldY: number): { x: number; y: number };
    getWorldViewportBounds(extra?: number): { minX: number; maxX: number; minY: number; maxY: number };
    hasTimeVaryingFields(): boolean;
  }
}

declare module '*js/core/Renderer.js' {
  export class Renderer {
    bgCanvas: HTMLCanvasElement | null;
    fieldCanvas: HTMLCanvasElement | null;
    particleCanvas: HTMLCanvasElement | null;
    width: number;
    height: number;
    dpr: number;
    init(): void;
    resize(): void;
    render(scene: any): void;
    invalidateFields(): void;
  }
}

declare module '*js/core/PhysicsEngine.js' {
  export class PhysicsEngine {
    update(scene: any, dt: number): void;
  }
}

declare module '*js/interactions/DragDropManager.js' {
  export class DragDropManager {
    constructor(scene: any, renderer: any, options?: LegacyRecord);
    createObject(type: string, x: number, y: number): void;
    dispose(): void;
  }
}

declare module '*js/core/registerObjects.js' {
  export type LegacyRegistryEntry = {
    rendererKey?: string;
    schema?: (() => unknown[]) | unknown[];
    interaction?: LegacyRecord;
    defaults?: (() => LegacyRecord) | LegacyRecord;
    physicsHooks?: LegacyRecord;
    [key: string]: unknown;
  };

  export const registry: {
    get(type: string): LegacyRegistryEntry | null;
    create(type: string, data?: LegacyRecord): LegacyRecord;
    listByCategory(): Record<string, LegacyRecord[]>;
    register(type: string, entry: LegacyRegistryEntry): void;
  };
}

declare module '*js/utils/Serializer.js' {
  export class Serializer {
    static saveSceneData(data: LegacyRecord, name: string): boolean;
    static loadScene(name: string): LegacyRecord | null;
    static validateSceneData(data: unknown): { valid: boolean; error?: string };
    static exportToFile(scene: { serialize: () => LegacyRecord }, filename?: string): void;
    static importFromFile(file: File, callback: (error: Error | null, data: unknown) => void): void;
  }
}

declare module '*js/utils/ThemeManager.js' {
  export class ThemeManager {
    toggle(): void;
    getCurrentTheme(): string;
  }
}

declare module '*js/utils/PerformanceMonitor.js' {
  export class PerformanceMonitor {
    startFrame(): void;
    endFrame(): void;
    getFPS(): number;
  }
}

declare module '*js/utils/ResetBaseline.js' {
  export function createResetBaselineController(): {
    setBaseline(snapshot: LegacyRecord): boolean;
    getBaseline(): LegacyRecord | null;
    hasBaseline(): boolean;
    restoreBaseline(): LegacyRecord | null;
  };
}

declare module '*js/ui/SchemaForm.js' {
  export function isFieldEnabled(field: LegacyRecord, values: LegacyRecord): boolean;
  export function isFieldVisible(field: LegacyRecord, values: LegacyRecord): boolean;
  export function parseExpressionInput(
    text: unknown,
    scene: any
  ): { ok: boolean; error?: string; value?: number | null; expr?: string | null; empty?: boolean };
}

declare module '*js/modes/DemoMode.js' {
  export const DEMO_BASE_PIXELS_PER_UNIT: number;
  export const DEMO_MAX_ZOOM: number;
  export const DEMO_MIN_ZOOM: number;
  export const DEMO_ZOOM_STEP: number;
  export function applyDemoZoomToScene(
    scene: LegacyRecord,
    options?: { newPixelsPerMeter: number; anchorX?: number; anchorY?: number }
  ): boolean;
  export function getNextDemoZoom(
    currentZoom: number,
    deltaY: number,
    options?: { step?: number; min?: number; max?: number }
  ): number;
}

declare module '*js/modes/GeometryScaling.js' {
  export function getObjectGeometryScale(object: LegacyRecord): number;
  export function getObjectRealDimension(object: LegacyRecord, key: string, scene: LegacyRecord): number | null;
  export function isGeometryDimensionKey(key: unknown): boolean;
  export function setObjectDisplayDimension(
    object: LegacyRecord,
    key: string,
    displayValue: number,
    scene: LegacyRecord
  ): boolean;
  export function setObjectRealDimension(
    object: LegacyRecord,
    key: string,
    realValue: number,
    scene: LegacyRecord
  ): boolean;
  export function syncObjectDisplayGeometry(object: LegacyRecord, scene: LegacyRecord): boolean;
}

declare module '*js/presets/Presets.js' {
  export class Presets {
    static get(name: string): { name: string; data: LegacyRecord } | null | undefined;
  }
}
