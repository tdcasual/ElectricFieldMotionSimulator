import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';
import { useSceneStore } from '../src/stores/sceneStore';

beforeEach(() => setActivePinia(createPinia()));

describe('sceneStore', () => {
  it('dispatches addObject command and updates selected id', () => {
    const store = useSceneStore();
    store.dispatch({ type: 'addObject', payload: { objectType: 'particle' } });
    expect(store.selectedObjectId).not.toBeNull();
  });
});
