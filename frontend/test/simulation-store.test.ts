import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';
import { useSimulationStore } from '../src/stores/simulationStore';

beforeEach(() => setActivePinia(createPinia()));

describe('simulationStore', () => {
  it('toggles running state', () => {
    const store = useSimulationStore();
    expect(store.running).toBe(false);
    store.toggleRunning();
    expect(store.running).toBe(true);
  });
});
