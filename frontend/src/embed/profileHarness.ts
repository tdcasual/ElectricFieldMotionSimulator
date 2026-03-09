import type { RuntimeSnapshot, SceneMutationResult } from '../runtime/simulatorRuntime';

type ProfileSceneLoadResult = boolean | SceneMutationResult;
type ProfileFrameStats = RuntimeSnapshot['frameStats'];

type ProfileHarnessStore = {
  loadSceneData: (data: Record<string, unknown>) => ProfileSceneLoadResult;
  startRunning: () => void;
  stopRunning: () => void;
  selectObjectByIndex: (index: number) => { ok: true; id: string | null } | { ok: false; error: string };
  openPropertyPanel: () => boolean;
  openVariablesPanel: () => void | boolean;
  fps: number;
  particleCount: number;
  objectCount: number;
  running: boolean;
  frameStats: ProfileFrameStats;
};

export type ProfileSnapshot = {
  fps: number;
  particleCount: number;
  objectCount: number;
  running: boolean;
  frameStats: ProfileFrameStats;
};

export type BrowserProfileHarness = {
  loadSceneData: (data: Record<string, unknown>) => SceneMutationResult;
  startRunning: () => void;
  stopRunning: () => void;
  selectObjectByIndex: (index: number) => { ok: true; id: string | null } | { ok: false; error: string };
  openPropertyPanel: () => boolean;
  openVariablesPanel: () => boolean;
  getSnapshot: () => ProfileSnapshot;
};

function asFiniteNumber(value: unknown) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function normalizeFrameStats(frameStats: ProfileFrameStats): ProfileFrameStats {
  if (!frameStats) return null;
  return {
    avgMs: asFiniteNumber(frameStats.avgMs),
    p95Ms: asFiniteNumber(frameStats.p95Ms),
    maxMs: asFiniteNumber(frameStats.maxMs),
    sampleCount: Math.max(0, Math.round(asFiniteNumber(frameStats.sampleCount)))
  };
}

function normalizeSceneLoadResult(result: ProfileSceneLoadResult): SceneMutationResult {
  if (typeof result === 'boolean') {
    return result ? { ok: true } : { ok: false, error: 'Scene payload was rejected.' };
  }
  if (result && typeof result === 'object' && result.ok === false) {
    return {
      ok: false,
      error: typeof result.error === 'string' && result.error.trim().length > 0
        ? result.error
        : 'Scene payload was rejected.'
    };
  }
  return { ok: true };
}

declare global {
  interface Window {
    __ELECTRIC_FIELD_PROFILE__?: BrowserProfileHarness;
  }
}

export function installProfileHarness(targetWindow: Window, store: ProfileHarnessStore) {
  const harness: BrowserProfileHarness = {
    loadSceneData(data) {
      return normalizeSceneLoadResult(store.loadSceneData(data));
    },
    startRunning() {
      store.startRunning();
    },
    stopRunning() {
      store.stopRunning();
    },
    selectObjectByIndex(index) {
      return store.selectObjectByIndex(index);
    },
    openPropertyPanel() {
      return store.openPropertyPanel();
    },
    openVariablesPanel() {
      return store.openVariablesPanel() !== false;
    },
    getSnapshot() {
      return {
        fps: asFiniteNumber(store.fps),
        particleCount: asFiniteNumber(store.particleCount),
        objectCount: asFiniteNumber(store.objectCount),
        running: Boolean(store.running),
        frameStats: normalizeFrameStats(store.frameStats)
      };
    }
  };

  Object.defineProperty(targetWindow, '__ELECTRIC_FIELD_PROFILE__', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: harness
  });

  return () => {
    delete targetWindow.__ELECTRIC_FIELD_PROFILE__;
  };
}
