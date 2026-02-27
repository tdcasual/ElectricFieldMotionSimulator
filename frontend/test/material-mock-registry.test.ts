import { describe, expect, it } from 'vitest';
import { listMockMaterials, resolveMockMaterial } from '../src/embed/materialMockRegistry';

describe('material mock registry', () => {
  it('includes documented mock material ids', () => {
    const ids = listMockMaterials();
    expect(ids).toContain('mock-empty');
    expect(ids).toContain('mock-particle');
  });

  it('resolves material id to scene source', () => {
    const material = resolveMockMaterial('mock-particle');
    expect(material).toBeTruthy();
    expect(material?.sceneUrl).toBe('/scenes/material-mock-particle.json');
  });
});
