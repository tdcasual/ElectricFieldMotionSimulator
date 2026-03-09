import type { RuntimeSnapshot, SceneMutationResult } from '../runtime/simulatorRuntime';

type ProfileHarnessStoreSource = {
  loadSceneData: (data: Record<string, unknown>) => SceneMutationResult;
  startRunning: () => void;
  stopRunning: () => void;
  selectObjectByIndex: (index: number) => { ok: true; id: string | null } | { ok: false; error: string };
  openPropertyPanel: () => boolean;
  openVariablesPanel: () => void | boolean;
  fps: number;
  particleCount: number;
  objectCount: number;
  running: boolean;
  frameStats: RuntimeSnapshot['frameStats'];
};

export function createProfileHarnessStore(store: ProfileHarnessStoreSource) {
  return {
    loadSceneData: (data: Record<string, unknown>) => store.loadSceneData(data),
    startRunning: () => store.startRunning(),
    stopRunning: () => store.stopRunning(),
    selectObjectByIndex: (index: number) => store.selectObjectByIndex(index),
    openPropertyPanel: () => store.openPropertyPanel(),
    openVariablesPanel: () => store.openVariablesPanel(),
    get fps() {
      return store.fps;
    },
    get particleCount() {
      return store.particleCount;
    },
    get objectCount() {
      return store.objectCount;
    },
    get running() {
      return store.running;
    },
    get frameStats() {
      return store.frameStats;
    }
  };
}
