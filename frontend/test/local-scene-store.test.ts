import { describe, it, expect } from 'vitest';
import { saveScene, loadScene } from '../src/io/localSceneStore';

describe('local scene store', () => {
  it('round-trips named scene payload', () => {
    saveScene('demo', { version: '2.0', objects: [], settings: {} });
    expect(loadScene('demo')?.version).toBe('2.0');
  });
});
