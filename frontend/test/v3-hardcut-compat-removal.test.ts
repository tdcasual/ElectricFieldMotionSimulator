import { describe, expect, it } from 'vitest';
import { applyCreateObject, createInitialSceneAggregate } from '../src/v3/domain/sceneAggregate';
import { parseEmbedConfigFromSearch } from '../src/embed/embedConfig';
import { validateSceneData } from '../src/io/sceneIO';

describe('v3 hardcut compatibility removal', () => {
  it('rejects unknown object type instead of silently coercing', () => {
    const state = createInitialSceneAggregate();
    expect(() => applyCreateObject(state, {
      type: 'legacy-unknown',
      x: 10,
      y: 20
    })).toThrow(/unsupported object type/i);
  });

  it('does not accept deprecated embed query aliases', () => {
    const parsed = parseEmbedConfigFromSearch(
      '?m=view&scene_data=%7B%22version%22%3A%223.0%22%7D&filename=%2Fscene.json&material_id=legacy&lang=zh'
    );

    expect(parsed.mode).toBe('edit');
    expect(parsed.sceneData).toBeNull();
    expect(parsed.sceneUrl).toBeNull();
    expect(parsed.materialId).toBeNull();
  });

  it('rejects flat x/y object payload and requires strict position/velocity object shape', () => {
    const result = validateSceneData({
      version: '3.0',
      revision: 0,
      running: false,
      timeStep: 0.016,
      viewport: { width: 1280, height: 720 },
      selectedObjectId: null,
      objects: [
        {
          id: 'obj-1',
          type: 'particle',
          x: 10,
          y: 20,
          velocityX: 0,
          velocityY: 0,
          radius: 10,
          width: 20,
          height: 20,
          color: '#58a6ff',
          props: {}
        }
      ]
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected validation failure');
    expect(result.error).toMatch(/position|velocity/i);
  });
});
