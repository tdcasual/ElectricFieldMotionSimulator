import { describe, it, expect } from 'vitest';
import { validateSceneData } from '../src/io/sceneIO';

describe('scene io', () => {
  it('rejects payload without version', () => {
    const result = validateSceneData({ objects: [] });
    expect(result.ok).toBe(false);
  });

  it('rejects payload with too many objects', () => {
    const result = validateSceneData({
      version: '1.0',
      settings: {},
      objects: Array.from({ length: 5001 }, () => ({ type: 'particle' }))
    });
    expect(result.ok).toBe(false);
  });

  it('rejects object entries without type', () => {
    const result = validateSceneData({
      version: '1.0',
      settings: {},
      objects: [{}]
    });
    expect(result.ok).toBe(false);
  });

  it('rejects non-finite numeric object fields', () => {
    const result = validateSceneData({
      version: '1.0',
      settings: {},
      objects: [{ type: 'particle', x: 'not-a-number' }]
    });
    expect(result.ok).toBe(false);
  });

  it('rejects emitter settings above hard limits', () => {
    const result = validateSceneData({
      version: '1.0',
      settings: {},
      objects: [{ type: 'electron-gun', emissionRate: 30000 }]
    });
    expect(result.ok).toBe(false);
  });
});
