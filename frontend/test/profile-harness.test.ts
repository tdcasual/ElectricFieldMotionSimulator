import { describe, expect, it, vi } from 'vitest';
import { installProfileHarness } from '../src/embed/profileHarness';
import { createProfileHarnessStore } from '../src/embed/profileHarnessStore';

describe('profile harness', () => {

  it('maps live store state into the profile harness snapshot bridge', () => {
    const source = {
      loadSceneData: vi.fn(() => ({ ok: true as const })),
      startRunning: vi.fn(),
      stopRunning: vi.fn(),
      selectObjectByIndex: vi.fn(() => ({ ok: true as const, id: 'obj-0' })),
      openPropertyPanel: vi.fn(() => true),
      openVariablesPanel: vi.fn(() => true),
      fps: 10,
      particleCount: 11,
      objectCount: 12,
      running: false,
      frameStats: {
        avgMs: 18,
        p95Ms: 24,
        maxMs: 30,
        sampleCount: 8
      }
    };

    const mapped = createProfileHarnessStore(source);
    expect(mapped.fps).toBe(10);
    expect(mapped.particleCount).toBe(11);
    expect(mapped.objectCount).toBe(12);
    expect(mapped.running).toBe(false);
    expect(mapped.frameStats).toEqual({
      avgMs: 18,
      p95Ms: 24,
      maxMs: 30,
      sampleCount: 8
    });

    source.fps = 40;
    source.particleCount = 41;
    source.objectCount = 42;
    source.running = true;
    source.frameStats = {
      avgMs: 16,
      p95Ms: 20,
      maxMs: 22,
      sampleCount: 12
    };

    expect(mapped.fps).toBe(40);
    expect(mapped.particleCount).toBe(41);
    expect(mapped.objectCount).toBe(42);
    expect(mapped.running).toBe(true);
    expect(mapped.frameStats).toEqual({
      avgMs: 16,
      p95Ms: 20,
      maxMs: 22,
      sampleCount: 12
    });
  });
  it('installs limited browser profile api and removes it on dispose', () => {
    const calls: string[] = [];
    const profileWindow = window as Window & { __ELECTRIC_FIELD_PROFILE__?: Record<string, unknown> };
    const store = {
      loadSceneData: vi.fn(() => ({ ok: true as const })),
      startRunning: vi.fn(() => {
        calls.push('start');
      }),
      stopRunning: vi.fn(() => {
        calls.push('stop');
      }),
      selectObjectByIndex: vi.fn((index: number) => ({ ok: true as const, id: `obj-${index}` })),
      openPropertyPanel: vi.fn(() => true),
      openVariablesPanel: vi.fn(() => true),
      fps: 58,
      particleCount: 120,
      objectCount: 121,
      running: true,
      frameStats: {
        avgMs: 17.2,
        p95Ms: 25.1,
        maxMs: 30.3,
        sampleCount: 60
      }
    };

    const dispose = installProfileHarness(profileWindow, store);
    const harness = profileWindow.__ELECTRIC_FIELD_PROFILE__ as {
      loadSceneData: (data: Record<string, unknown>) => { ok: boolean; error?: string };
      startRunning: () => void;
      stopRunning: () => void;
      selectObjectByIndex: (index: number) => { ok: boolean; id?: string; error?: string };
      openPropertyPanel: () => boolean;
      openVariablesPanel: () => boolean;
      getSnapshot: () => {
        fps: number;
        particleCount: number;
        objectCount: number;
        running: boolean;
        frameStats: { avgMs: number; p95Ms: number; maxMs: number; sampleCount: number } | null;
      };
    } | undefined;

    expect(harness).toBeTruthy();
    expect(Object.keys(harness ?? {}).sort()).toEqual([
      'getSnapshot',
      'loadSceneData',
      'openPropertyPanel',
      'openVariablesPanel',
      'selectObjectByIndex',
      'startRunning',
      'stopRunning'
    ]);
    expect(harness?.getSnapshot()).toEqual({
      fps: 58,
      particleCount: 120,
      objectCount: 121,
      running: true,
      frameStats: {
        avgMs: 17.2,
        p95Ms: 25.1,
        maxMs: 30.3,
        sampleCount: 60
      }
    });
    expect(harness?.loadSceneData({ version: '1.0', settings: {}, objects: [] })).toEqual({ ok: true });

    expect(harness?.selectObjectByIndex(3)).toEqual({ ok: true, id: 'obj-3' });
    expect(harness?.openPropertyPanel()).toBe(true);
    expect(harness?.openVariablesPanel()).toBe(true);
    harness?.startRunning();
    harness?.stopRunning();

    expect(calls).toEqual(['start', 'stop']);
    expect(store.loadSceneData).toHaveBeenCalledTimes(1);
    expect(store.selectObjectByIndex).toHaveBeenCalledWith(3);
    expect(store.openPropertyPanel).toHaveBeenCalledTimes(1);
    expect(store.openVariablesPanel).toHaveBeenCalledTimes(1);

    dispose();
    expect(profileWindow.__ELECTRIC_FIELD_PROFILE__).toBeUndefined();
  });

  it('normalizes legacy boolean scene load results into structured responses', () => {
    const profileWindow = window as Window & { __ELECTRIC_FIELD_PROFILE__?: Record<string, unknown> };
    const dispose = installProfileHarness(profileWindow, {
      loadSceneData: () => true,
      startRunning: () => {},
      stopRunning: () => {},
      selectObjectByIndex: () => ({ ok: false as const, error: 'missing' }),
      openPropertyPanel: () => false,
      openVariablesPanel: () => false,
      fps: 0,
      particleCount: 0,
      objectCount: 0,
      running: false,
      frameStats: null
    });

    const result = (profileWindow.__ELECTRIC_FIELD_PROFILE__ as { loadSceneData: (data: Record<string, unknown>) => unknown })
      .loadSceneData({ version: '1.0', settings: {}, objects: [] });

    expect(result).toEqual({ ok: true });
    dispose();
  });
});
