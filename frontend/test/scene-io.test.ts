import { describe, it, expect } from 'vitest';
import { validateSceneData } from '../src/io/sceneIO';

describe('scene io', () => {
  it('rejects payload without version', () => {
    const result = validateSceneData({ objects: [] });
    expect(result.ok).toBe(false);
  });
});
