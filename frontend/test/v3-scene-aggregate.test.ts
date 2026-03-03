import { describe, expect, it } from 'vitest';
import {
  applyCreateObject,
  applySetTimeStep,
  applyToggleRunning,
  createInitialSceneAggregate
} from '../src/v3/domain/sceneAggregate';

describe('v3 scene aggregate', () => {
  it('creates default V3 state', () => {
    const state = createInitialSceneAggregate();

    expect(state.version).toBe('3.0');
    expect(state.revision).toBe(0);
    expect(state.running).toBe(false);
    expect(state.timeStep).toBe(0.016);
    expect(state.objects).toEqual([]);
  });

  it('appends object and increments revision', () => {
    const state = createInitialSceneAggregate();
    const next = applyCreateObject(state, {
      type: 'particle',
      x: 120,
      y: 240
    });

    expect(next.revision).toBe(state.revision + 1);
    expect(next.objects).toHaveLength(1);
    expect(next.objects[0].type).toBe('particle');
    expect(next.objects[0].position).toEqual({ x: 120, y: 240 });
    expect(next.objects[0].id).toMatch(/^obj-/);
  });

  it('toggles running and increments revision', () => {
    const state = createInitialSceneAggregate();
    const running = applyToggleRunning(state);
    const stopped = applyToggleRunning(running);

    expect(running.running).toBe(true);
    expect(running.revision).toBe(1);
    expect(stopped.running).toBe(false);
    expect(stopped.revision).toBe(2);
  });

  it('sets valid timestep and rejects invalid values', () => {
    const state = createInitialSceneAggregate();
    const next = applySetTimeStep(state, 0.02);

    expect(next.timeStep).toBe(0.02);
    expect(next.revision).toBe(1);
    expect(() => applySetTimeStep(next, 0)).toThrow(/timeStep/i);
    expect(() => applySetTimeStep(next, Number.NaN)).toThrow(/timeStep/i);
  });
});
