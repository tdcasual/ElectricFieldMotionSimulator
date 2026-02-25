import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';
import { useSimulatorStore } from '../src/stores/simulatorStore';

beforeEach(() => setActivePinia(createPinia()));

describe('simulatorStore demo mode', () => {
  it('toggles running state', () => {
    const store = useSimulatorStore();
    expect(store.running).toBe(false);
    store.toggleRunning();
    expect(store.running).toBe(true);
    store.toggleRunning();
    expect(store.running).toBe(false);
  });

  it('enters demo mode and restores snapshot on exit', () => {
    const store = useSimulatorStore();
    store.createObjectAtCenter('particle');
    expect(store.objectCount).toBe(1);
    expect(store.demoMode).toBe(false);

    store.toggleDemoMode();
    expect(store.demoMode).toBe(true);
    expect(store.objectCount).toBe(0);

    store.toggleDemoMode();
    expect(store.demoMode).toBe(false);
    expect(store.objectCount).toBe(1);
  });

  it('loads preset and updates object count', () => {
    const store = useSimulatorStore();
    const ok = store.loadPreset('uniform-acceleration');
    expect(ok).toBe(true);
    expect(store.objectCount).toBeGreaterThan(0);
  });

  it('updates boundary margin visibility when boundary mode changes', () => {
    const store = useSimulatorStore();
    expect(store.showBoundaryMarginControl).toBe(true);
    store.setBoundaryMode('remove');
    expect(store.showBoundaryMarginControl).toBe(false);
    store.setBoundaryMode('margin');
    expect(store.showBoundaryMarginControl).toBe(true);
  });
});
