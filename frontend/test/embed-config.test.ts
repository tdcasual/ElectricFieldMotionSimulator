import { describe, expect, it } from 'vitest';
import { parseEmbedConfigFromSearch } from '../src/embed/embedConfig';

describe('embed config parser', () => {
  it('uses safe defaults', () => {
    const config = parseEmbedConfigFromSearch('');
    expect(config.mode).toBe('edit');
    expect(config.toolbar).toBe(true);
    expect(config.autoplay).toBe(false);
    expect(config.sceneUrl).toBeNull();
    expect(config.sceneData).toBeNull();
    expect(config.materialId).toBeNull();
  });

  it('parses canonical fields', () => {
    const config = parseEmbedConfigFromSearch(
      '?mode=view&sceneUrl=https%3A%2F%2Fexample.com%2Fscene.json&autoplay=1&toolbar=0'
    );
    expect(config.mode).toBe('view');
    expect(config.sceneUrl).toBe('https://example.com/scene.json');
    expect(config.autoplay).toBe(true);
    expect(config.toolbar).toBe(false);
  });

  it('parses alias fields', () => {
    const config = parseEmbedConfigFromSearch(
      '?m=view&scene=https%3A%2F%2Fexample.com%2Flegacy.json'
    );
    expect(config.mode).toBe('view');
    expect(config.sceneUrl).toBe('https://example.com/legacy.json');
  });

  it('parses material id alias fields', () => {
    const config = parseEmbedConfigFromSearch('?material_id=abc123');
    expect(config.materialId).toBe('abc123');
  });

  it('keeps only highest-priority scene source', () => {
    const encoded = encodeURIComponent(JSON.stringify({ version: '1.0', settings: {}, objects: [] }));
    const config = parseEmbedConfigFromSearch(
      `?sceneData=${encoded}&sceneUrl=https%3A%2F%2Fexample.com%2Fscene.json&materialId=mat-1`
    );
    expect(config.sceneData).toEqual({ version: '1.0', settings: {}, objects: [] });
    expect(config.sceneUrl).toBeNull();
    expect(config.materialId).toBeNull();
  });

  it('defaults toolbar to false in view mode', () => {
    const config = parseEmbedConfigFromSearch('?mode=view');
    expect(config.mode).toBe('view');
    expect(config.toolbar).toBe(false);
  });
});
