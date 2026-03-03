import { describe, expect, it } from 'vitest';
import {
  applyCreateObject,
  applyToggleRunning,
  createInitialSceneAggregate
} from '../src/v3/domain/sceneAggregate';
import { projectSceneReadModel } from '../src/v3/application/readModel/projectSceneReadModel';

describe('v3 scene read-model projection', () => {
  it('projects counters and timestep label from aggregate state', () => {
    const base = createInitialSceneAggregate();
    const withObject = applyCreateObject(base, {
      type: 'particle',
      x: 30,
      y: 60
    });
    const running = applyToggleRunning(withObject);
    const projected = projectSceneReadModel(running);

    expect(projected.revision).toBe(running.revision);
    expect(projected.running).toBe(true);
    expect(projected.timeStep).toBe(0.016);
    expect(projected.timeStepLabel).toBe('16ms');
    expect(projected.objectCount).toBe(1);
  });

  it('keeps timestep label deterministic for decimal values', () => {
    const base = createInitialSceneAggregate();
    const projected = projectSceneReadModel({
      ...base,
      revision: 3,
      timeStep: 0.02
    });

    expect(projected.timeStepLabel).toBe('20ms');
    expect(projected.revision).toBe(3);
  });
});

