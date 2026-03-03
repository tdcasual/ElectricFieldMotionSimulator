import { describe, expect, it } from 'vitest';
import { createMemorySceneStorageAdapter } from '../src/v3/infrastructure/memorySceneStorageAdapter';
import { createInMemoryRenderAdapter } from '../src/v3/infrastructure/inMemoryRenderAdapter';
import { createInitialSceneAggregate } from '../src/v3/domain/sceneAggregate';

describe('v3 infrastructure adapters', () => {
  it('memory scene storage saves and loads deep-cloned state', async () => {
    const storage = createMemorySceneStorageAdapter();
    const state = createInitialSceneAggregate();
    state.objects.push({
      id: 'obj-1',
      type: 'particle',
      position: { x: 1, y: 2 },
      velocity: { x: 0, y: 0 },
      radius: 10,
      width: 20,
      height: 20,
      color: '#58a6ff',
      props: { charge: 1 }
    });

    await storage.save('scene-a', state);
    const loaded = await storage.load('scene-a');

    expect(loaded).toEqual(state);
    if (!loaded) throw new Error('expected loaded state');
    loaded.objects[0].props.charge = 9;
    const reloaded = await storage.load('scene-a');
    expect(reloaded?.objects[0].props.charge).toBe(1);
  });

  it('memory scene storage returns null for unknown key', async () => {
    const storage = createMemorySceneStorageAdapter();
    const loaded = await storage.load('missing-key');

    expect(loaded).toBeNull();
  });

  it('in-memory render adapter stores latest published snapshot', () => {
    const adapter = createInMemoryRenderAdapter();

    expect(adapter.getLatest()).toBeNull();

    adapter.publish({
      revision: 2,
      running: true,
      timeStep: 0.02,
      timeStepLabel: '20ms',
      viewport: { width: 800, height: 600 },
      objectCount: 3,
      selectedObjectId: null,
      objects: []
    });

    expect(adapter.getLatest()).toEqual({
      revision: 2,
      running: true,
      timeStep: 0.02,
      timeStepLabel: '20ms',
      viewport: { width: 800, height: 600 },
      objectCount: 3,
      selectedObjectId: null,
      objects: []
    });
  });
});
