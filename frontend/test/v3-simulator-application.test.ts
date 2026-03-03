import { describe, expect, it } from 'vitest';
import { createV3SimulatorApplication } from '../src/v3/application/useCases/simulatorApplication';

describe('v3 simulator application use-cases', () => {
  it('exposes initial read-model and supports create/edit/play pipeline', () => {
    const app = createV3SimulatorApplication();

    expect(app.getReadModel().objectCount).toBe(0);
    expect(app.getReadModel().running).toBe(false);

    const created = app.createObjectAt({
      type: 'particle',
      x: 100,
      y: 120
    });
    expect(created.ok).toBe(true);
    expect(app.getReadModel().objectCount).toBe(1);

    const createdState = app.getState();
    const target = createdState.objects[0];
    expect(target).toBeDefined();
    const edited = app.setObjectProps({
      id: target.id,
      props: {
        charge: 3.2
      }
    });
    expect(edited.ok).toBe(true);
    expect(app.getState().objects[0].props.charge).toBe(3.2);

    const running = app.toggleRunning();
    expect(running.ok).toBe(true);
    expect(app.getReadModel().running).toBe(true);
  });

  it('returns typed error for invalid timestep and keeps state unchanged', () => {
    const app = createV3SimulatorApplication();
    const baseline = app.getState();

    const result = app.setTimeStep(0);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error result');
    expect(result.error.code).toBe('handler_failed');
    expect(app.getState()).toEqual(baseline);
  });

  it('publishes read-model snapshots to render adapter on successful commands', () => {
    const snapshots: Array<{ revision: number; objectCount: number; running: boolean }> = [];
    const app = createV3SimulatorApplication({
      renderAdapter: {
        publish(snapshot) {
          snapshots.push({
            revision: snapshot.revision,
            objectCount: snapshot.objectCount,
            running: snapshot.running
          });
        }
      }
    });

    app.createObjectAt({
      type: 'particle',
      x: 1,
      y: 2
    });
    app.toggleRunning();

    expect(snapshots.length).toBeGreaterThanOrEqual(2);
    expect(snapshots.at(-1)).toEqual(
      expect.objectContaining({
        running: true
      })
    );
  });
});

