import { describe, expect, it } from 'vitest';
import { buildRuntimeSnapshot } from '../src/runtime/runtimeSnapshotSync';

describe('runtimeSnapshotSync', () => {
  it('normalizes selected id and geometry payload into a runtime snapshot', () => {
    const snapshot = buildRuntimeSnapshot({
      running: true,
      mode: 'demo',
      timeStep: 0.02,
      fps: 60,
      objectCount: 3,
      particleCount: 5,
      selectedObject: { id: 42 },
      statusText: 'ok',
      geometryInteraction: {
        objectId: 1,
        sourceKey: 'radius',
        realValue: 2,
        displayValue: 3,
        objectScale: 1.5
      },
      frameStats: {
        avgMs: 18.2,
        p95Ms: 26.5,
        maxMs: 33,
        sampleCount: 60
      }
    });

    expect(snapshot.selectedObjectId).toBe('42');
    expect(snapshot.geometryInteraction).toEqual({
      objectId: '1',
      sourceKey: 'radius',
      realValue: 2,
      displayValue: 3,
      objectScale: 1.5
    });
    expect(snapshot.frameStats).toEqual({
      avgMs: 18.2,
      p95Ms: 26.5,
      maxMs: 33,
      sampleCount: 60
    });
  });
});
