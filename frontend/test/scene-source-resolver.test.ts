import { describe, expect, it } from 'vitest';
import { parseEmbedConfigFromSearch } from '../src/embed/embedConfig';
import { resolveSceneSource } from '../src/embed/sceneSourceResolver';

describe('scene source resolver', () => {
  it('returns none when no scene source is provided', async () => {
    const config = parseEmbedConfigFromSearch('');
    const result = await resolveSceneSource(config);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe('none');
    expect(result.data).toBeNull();
  });

  it('resolves inline scene data', async () => {
    const encoded = encodeURIComponent(JSON.stringify({ version: '1.0', settings: {}, objects: [] }));
    const config = parseEmbedConfigFromSearch(`?sceneData=${encoded}`);
    const result = await resolveSceneSource(config);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe('sceneData');
    expect(result.data?.version).toBe('1.0');
  });

  it('resolves scene from remote url', async () => {
    const config = parseEmbedConfigFromSearch('?sceneUrl=https%3A%2F%2Fexample.com%2Fscene.json');
    const fetchFn = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ version: '1.0', settings: {}, objects: [] })
    });
    const result = await resolveSceneSource(config, { fetchFn });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe('sceneUrl');
  });

  it('returns network error when fetch fails', async () => {
    const config = parseEmbedConfigFromSearch('?sceneUrl=https%3A%2F%2Fexample.com%2Fscene.json');
    const fetchFn = async () => {
      throw new Error('offline');
    };
    const result = await resolveSceneSource(config, { fetchFn });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('network');
  });

  it('returns validation error for invalid payload', async () => {
    const encoded = encodeURIComponent(JSON.stringify({ objects: [] }));
    const config = parseEmbedConfigFromSearch(`?sceneData=${encoded}`);
    const result = await resolveSceneSource(config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('validation');
  });

  it('preserves camera and variables fields from inline payload', async () => {
    const encoded = encodeURIComponent(JSON.stringify({
      version: '1.0',
      settings: {},
      camera: { offsetX: 120, offsetY: -32 },
      variables: { alpha: 2 },
      objects: []
    }));
    const config = parseEmbedConfigFromSearch(`?sceneData=${encoded}`);
    const result = await resolveSceneSource(config);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.data as Record<string, unknown>).camera).toEqual({ offsetX: 120, offsetY: -32 });
    expect((result.data as Record<string, unknown>).variables).toEqual({ alpha: 2 });
  });

  it('resolves scene from material id via resolver', async () => {
    const config = parseEmbedConfigFromSearch('?materialId=mock-particle');
    const result = await resolveSceneSource(config, {
      materialResolver: async (materialId) => {
        if (materialId !== 'mock-particle') return null;
        return {
          sceneData: {
            version: '1.0',
            settings: {},
            objects: [{ type: 'particle', x: 240, y: 180 }]
          }
        };
      }
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe('materialId');
    if (result.source === 'none' || result.data == null) {
      throw new Error('expected material scene payload');
    }
    expect(result.data.objects).toHaveLength(1);
  });

  it('returns material-not-found when material id cannot be resolved', async () => {
    const config = parseEmbedConfigFromSearch('?materialId=missing-id');
    const result = await resolveSceneSource(config, {
      materialResolver: async () => null
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('material-not-found');
  });
});
