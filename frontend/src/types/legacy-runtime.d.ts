type RuntimeRecord = Record<string, unknown>;

type RuntimeSceneObject = {
  id?: string | number | null;
  type?: string;
  [key: string]: unknown;
};

type RuntimeSceneSettings = RuntimeRecord & {
  mode: string;
  hostMode?: string;
  interactionLocked?: boolean;
  pixelsPerMeter: number;
  gravity: number;
  boundaryMode: string;
  boundaryMargin: number;
  vertexEditMode?: boolean;
};

type RuntimeSceneLike = {
  settings?: RuntimeSceneSettings;
  objects?: RuntimeSceneObject[];
};

declare module '*js/core/Scene.js' {
  export class Scene {
    objects: RuntimeSceneObject[];
    particles: RuntimeSceneObject[];
    selectedObject: RuntimeSceneObject | null;
    isPaused: boolean;
    time: number;
    settings: RuntimeSceneSettings;
    variables: RuntimeRecord;
    interaction: RuntimeRecord & { tangencyHint?: unknown; geometryOverlay?: unknown };
    addObject(object: RuntimeSceneObject): RuntimeSceneObject | null;
    removeObject(object: RuntimeSceneObject): this;
    getAllObjects(): RuntimeSceneObject[];
    findObjectAt(x: number, y: number): RuntimeSceneObject | null;
    clear(): void;
    duplicateObject(object: RuntimeSceneObject): RuntimeSceneObject;
    serialize(): RuntimeRecord;
    loadFromData(data: RuntimeRecord): void;
    setViewport(width: number, height: number): void;
    setCamera(offsetX?: number, offsetY?: number): void;
    toWorldPoint(screenX: number, screenY: number): { x: number; y: number };
    toScreenPoint(worldX: number, worldY: number): { x: number; y: number };
    getWorldViewportBounds(extra?: number): { minX: number; maxX: number; minY: number; maxY: number };
  }
}

declare module '*js/core/Renderer.js' {
  import type { Scene } from '*js/core/Scene.js';

  export class Renderer {
    particleCanvas: HTMLCanvasElement | null;
    width: number;
    height: number;
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
    constructor(scene: Scene, renderer: Renderer, options?: RuntimeRecord);
    createObject(type: string, x: number, y: number): void;
    dispose(): void;
  }
}

declare module '*js/core/registerObjects.js' {
  export type RuntimeRegistryEntry = RuntimeRecord & {
    label?: string;
    rendererKey?: string;
    schema?: (() => unknown[]) | unknown[];
    interaction?: RuntimeRecord;
  };

  export const registry: {
    get(type: string): RuntimeRegistryEntry | null;
    create(type: string, data?: RuntimeRecord): RuntimeSceneObject;
    listByCategory(): Record<string, RuntimeSceneObject[]>;
  };
}

declare module '*js/utils/Serializer.js' {
  export class Serializer {
    static saveSceneData(data: RuntimeRecord, name: string): boolean;
    static loadScene(name: string): RuntimeRecord | null;
    static validateSceneData(data: unknown): { valid: boolean; error?: string };
    static exportToFile(scene: { serialize: () => RuntimeRecord }, filename?: string): void;
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
    setBaseline(snapshot: RuntimeRecord): boolean;
    restoreBaseline(): RuntimeRecord | null;
  };
}

declare module '*js/ui/SchemaForm.js' {
  export function isFieldEnabled(field: RuntimeRecord, values: RuntimeRecord): boolean;
  export function isFieldVisible(field: RuntimeRecord, values: RuntimeRecord): boolean;
  export function parseExpressionInput(
    text: unknown,
    scene: RuntimeSceneLike
  ): { ok: boolean; error?: string; value?: number | null; expr?: string | null; empty?: boolean };
}

declare module '*js/modes/DemoMode.js' {
  export const DEMO_BASE_PIXELS_PER_UNIT: number;
  export const DEMO_MAX_ZOOM: number;
  export const DEMO_MIN_ZOOM: number;
  export const DEMO_ZOOM_STEP: number;
  export function applyDemoZoomToScene(
    scene: RuntimeSceneLike,
    options?: { newPixelsPerMeter: number; anchorX?: number; anchorY?: number }
  ): boolean;
  export function getNextDemoZoom(
    currentZoom: number,
    deltaY: number,
    options?: { step?: number; min?: number; max?: number }
  ): number;
}

declare module '*js/modes/GeometryScaling.js' {
  export function getObjectGeometryScale(object: RuntimeSceneObject): number;
  export function getObjectRealDimension(object: RuntimeSceneObject, key: string, scene: RuntimeSceneLike): number | null;
  export function isGeometryDimensionKey(key: unknown): boolean;
  export function setObjectDisplayDimension(
    object: RuntimeSceneObject,
    key: string,
    displayValue: number,
    scene: RuntimeSceneLike
  ): boolean;
  export function setObjectRealDimension(
    object: RuntimeSceneObject,
    key: string,
    realValue: number,
    scene: RuntimeSceneLike
  ): boolean;
  export function syncObjectDisplayGeometry(object: RuntimeSceneObject, scene: RuntimeSceneLike): boolean;
}

declare module '*js/presets/Presets.js' {
  export class Presets {
    static get(name: string): { name: string; data: RuntimeRecord } | null | undefined;
  }
}
