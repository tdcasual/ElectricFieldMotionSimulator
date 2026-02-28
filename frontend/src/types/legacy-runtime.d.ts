type LegacyUnknownRecord = Record<string, unknown>;

type LegacySceneObject = {
  id?: string | null;
  type?: string;
  [key: string]: unknown;
};

type LegacySceneSettings = {
  mode: string;
  hostMode?: string;
  interactionLocked?: boolean;
  pixelsPerMeter: number;
  gravity: number;
  boundaryMode: string;
  boundaryMargin: number;
  [key: string]: unknown;
};

type LegacySceneLike = {
  objects?: LegacySceneObject[];
  settings?: Partial<LegacySceneSettings>;
};

declare module '*js/core/Scene.js' {
  export class Scene {
    objects: LegacySceneObject[];
    electricFields: LegacySceneObject[];
    magneticFields: LegacySceneObject[];
    disappearZones: LegacySceneObject[];
    emitters: LegacySceneObject[];
    particles: LegacySceneObject[];
    selectedObject: LegacySceneObject | null;
    isPaused: boolean;
    time: number;
    viewport: { width: number; height: number };
    camera: { offsetX: number; offsetY: number };
    interaction: { tangencyHint?: unknown; [key: string]: unknown };
    settings: LegacySceneSettings;
    variables: LegacyUnknownRecord;
    addObject(object: LegacySceneObject): LegacySceneObject | null;
    removeObject(object: LegacySceneObject): this;
    getAllObjects(): LegacySceneObject[];
    findObjectAt(x: number, y: number): LegacySceneObject | null;
    clear(): void;
    duplicateObject(object: LegacySceneObject): LegacySceneObject;
    serialize(): LegacyUnknownRecord;
    loadFromData(data: LegacyUnknownRecord): void;
    setViewport(width: number, height: number): void;
    setCamera(offsetX?: number, offsetY?: number): void;
    toWorldPoint(screenX: number, screenY: number): { x: number; y: number };
    toScreenPoint(worldX: number, worldY: number): { x: number; y: number };
    getWorldViewportBounds(extra?: number): { minX: number; maxX: number; minY: number; maxY: number };
    hasTimeVaryingFields(): boolean;
  }
}

declare module '*js/core/Renderer.js' {
  import type { Scene } from '*js/core/Scene.js';

  export class Renderer {
    bgCanvas: HTMLCanvasElement | null;
    fieldCanvas: HTMLCanvasElement | null;
    particleCanvas: HTMLCanvasElement | null;
    width: number;
    height: number;
    dpr: number;
    init(): void;
    resize(): void;
    render(scene: Scene): void;
    invalidateFields(): void;
  }
}

declare module '*js/core/PhysicsEngine.js' {
  import type { Scene } from '*js/core/Scene.js';

  export class PhysicsEngine {
    update(scene: Scene, dt: number): void;
  }
}

declare module '*js/interactions/DragDropManager.js' {
  import type { Renderer } from '*js/core/Renderer.js';
  import type { Scene } from '*js/core/Scene.js';

  export class DragDropManager {
    constructor(scene: Scene, renderer: Renderer, options?: LegacyUnknownRecord);
    createObject(type: string, x: number, y: number): void;
    dispose(): void;
  }
}

declare module '*js/core/registerObjects.js' {
  export type LegacyRegistryEntry = {
    label?: string;
    rendererKey?: string;
    schema?: (() => unknown[]) | unknown[];
    interaction?: LegacyUnknownRecord;
    defaults?: (() => LegacyUnknownRecord) | LegacyUnknownRecord;
    physicsHooks?: LegacyUnknownRecord;
    [key: string]: unknown;
  };

  export const registry: {
    get(type: string): LegacyRegistryEntry | null;
    create(type: string, data?: LegacyUnknownRecord): LegacySceneObject;
    listByCategory(): Record<string, LegacySceneObject[]>;
    register(type: string, entry: LegacyRegistryEntry): void;
  };
}

declare module '*js/utils/Serializer.js' {
  export class Serializer {
    static saveSceneData(data: LegacyUnknownRecord, name: string): boolean;
    static loadScene(name: string): LegacyUnknownRecord | null;
    static validateSceneData(data: unknown): { valid: boolean; error?: string };
    static exportToFile(scene: { serialize: () => LegacyUnknownRecord }, filename?: string): void;
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
    setBaseline(snapshot: LegacyUnknownRecord): boolean;
    getBaseline(): LegacyUnknownRecord | null;
    hasBaseline(): boolean;
    restoreBaseline(): LegacyUnknownRecord | null;
  };
}

declare module '*js/ui/SchemaForm.js' {
  export function isFieldEnabled(field: LegacyUnknownRecord, values: LegacyUnknownRecord): boolean;
  export function isFieldVisible(field: LegacyUnknownRecord, values: LegacyUnknownRecord): boolean;
  export function parseExpressionInput(
    text: unknown,
    scene: LegacySceneLike
  ): { ok: boolean; error?: string; value?: number | null; expr?: string | null; empty?: boolean };
}

declare module '*js/modes/DemoMode.js' {
  export const DEMO_BASE_PIXELS_PER_UNIT: number;
  export const DEMO_MAX_ZOOM: number;
  export const DEMO_MIN_ZOOM: number;
  export const DEMO_ZOOM_STEP: number;
  export function applyDemoZoomToScene(
    scene: LegacySceneLike,
    options?: { newPixelsPerMeter: number; anchorX?: number; anchorY?: number }
  ): boolean;
  export function getNextDemoZoom(
    currentZoom: number,
    deltaY: number,
    options?: { step?: number; min?: number; max?: number }
  ): number;
}

declare module '*js/modes/GeometryScaling.js' {
  export function getObjectGeometryScale(object: LegacySceneObject): number;
  export function getObjectRealDimension(object: LegacySceneObject, key: string, scene: LegacySceneLike): number | null;
  export function isGeometryDimensionKey(key: unknown): boolean;
  export function setObjectDisplayDimension(
    object: LegacySceneObject,
    key: string,
    displayValue: number,
    scene: LegacySceneLike
  ): boolean;
  export function setObjectRealDimension(
    object: LegacySceneObject,
    key: string,
    realValue: number,
    scene: LegacySceneLike
  ): boolean;
  export function syncObjectDisplayGeometry(object: LegacySceneObject, scene: LegacySceneLike): boolean;
}

declare module '*js/presets/Presets.js' {
  export class Presets {
    static get(name: string): { name: string; data: LegacyUnknownRecord } | null | undefined;
  }
}
