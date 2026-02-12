import { defineStore } from 'pinia';
import type { EngineCommand } from '../engine/types';

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `obj-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useSceneStore = defineStore('scene', {
  state: () => ({
    selectedObjectId: null as string | null
  }),
  actions: {
    dispatch(command: EngineCommand) {
      if (command.type === 'addObject') {
        this.selectedObjectId = makeId();
        return;
      }

      if (command.type === 'updateObjectProps' && command.payload.id) {
        this.selectedObjectId = command.payload.id;
        return;
      }
    }
  }
});
