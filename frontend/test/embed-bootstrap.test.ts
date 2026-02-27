import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { parseEmbedConfigFromSearch } from '../src/embed/embedConfig';
import { useSimulatorStore } from '../src/stores/simulatorStore';

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('embed bootstrap in simulator store', () => {
  it('switches host mode', () => {
    const store = useSimulatorStore();
    expect(store.viewMode).toBe(false);
    store.setHostMode('view');
    expect(store.viewMode).toBe(true);
    store.setHostMode('edit');
    expect(store.viewMode).toBe(false);
  });

  it('loads scene payload via store api', () => {
    const store = useSimulatorStore();
    store.createObjectAtCenter('particle');
    expect(store.objectCount).toBe(1);

    const ok = store.loadSceneData({ version: '1.0', settings: {}, objects: [] });
    expect(ok).toBe(true);
    expect(store.objectCount).toBe(0);
  });

  it('applies autoplay while bootstrapping embed config', async () => {
    const store = useSimulatorStore();
    expect(store.running).toBe(false);

    const config = parseEmbedConfigFromSearch('?mode=view&autoplay=1');
    const result = await store.bootstrapFromEmbed(config);

    expect(result.ok).toBe(true);
    expect(store.viewMode).toBe(true);
    expect(store.running).toBe(true);
  });
});
