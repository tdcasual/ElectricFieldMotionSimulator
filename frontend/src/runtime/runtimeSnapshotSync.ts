export type RuntimeSnapshot = {
  running: boolean;
  mode: 'normal' | 'demo';
  timeStep: number;
  fps: number;
  objectCount: number;
  particleCount: number;
  selectedObjectId: string | null;
  statusText: string;
  geometryInteraction: {
    objectId: string | null;
    sourceKey: string;
    realValue: number;
    displayValue: number;
    objectScale: number;
  } | null;
  frameStats: {
    avgMs: number;
    p95Ms: number;
    maxMs: number;
    sampleCount: number;
  } | null;
};

export function buildRuntimeSnapshot(options: {
  running: boolean;
  mode: 'normal' | 'demo';
  timeStep: number;
  fps: number;
  objectCount: number;
  particleCount: number;
  selectedObject: { id?: unknown } | null;
  statusText: string;
  geometryInteraction: {
    objectId: unknown;
    sourceKey: string;
    realValue: number;
    displayValue: number;
    objectScale: number;
  } | null;
  frameStats?: {
    avgMs: number;
    p95Ms: number;
    maxMs: number;
    sampleCount: number;
  } | null;
}): RuntimeSnapshot {
  return {
    running: !!options.running,
    mode: options.mode,
    timeStep: options.timeStep,
    fps: options.fps,
    objectCount: options.objectCount,
    particleCount: options.particleCount,
    selectedObjectId: options.selectedObject?.id == null ? null : String(options.selectedObject.id),
    statusText: String(options.statusText || '就绪'),
    geometryInteraction: options.geometryInteraction
      ? {
          objectId: options.geometryInteraction.objectId == null ? null : String(options.geometryInteraction.objectId),
          sourceKey: options.geometryInteraction.sourceKey,
          realValue: options.geometryInteraction.realValue,
          displayValue: options.geometryInteraction.displayValue,
          objectScale: options.geometryInteraction.objectScale
        }
      : null,
    frameStats: options.frameStats
      ? {
          avgMs: options.frameStats.avgMs,
          p95Ms: options.frameStats.p95Ms,
          maxMs: options.frameStats.maxMs,
          sampleCount: options.frameStats.sampleCount
        }
      : null
  };
}
