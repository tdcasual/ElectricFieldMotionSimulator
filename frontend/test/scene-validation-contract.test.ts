import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { parseEmbedConfigFromSearch } from '../src/embed/embedConfig';
import { executeHostCommand } from '../src/embed/hostBridge';
import { resolveSceneSource } from '../src/embed/sceneSourceResolver';
import { validateSceneData } from '../src/io/sceneIO';
import { useSimulatorStore } from '../src/stores/simulatorStore';

const invalidScenePayload = { objects: [] };
const encodedInvalidScenePayload = encodeURIComponent(JSON.stringify(invalidScenePayload));

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('scene validation contract', () => {
  it('keeps first validation issue path in scene IO results', () => {
    const result = validateSceneData(invalidScenePayload);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('Invalid scene payload');
    expect(result.issues[0]).toContain('version');
  });

  it('keeps validation code and issue detail across resolver sources', async () => {
    const cases = [
      {
        label: 'sceneData',
        expectedSource: 'sceneData',
        resolve: () => resolveSceneSource(parseEmbedConfigFromSearch(`?sceneData=${encodedInvalidScenePayload}`))
      },
      {
        label: 'sceneUrl',
        expectedSource: 'sceneUrl',
        resolve: () =>
          resolveSceneSource(parseEmbedConfigFromSearch('?sceneUrl=https%3A%2F%2Fexample.com%2Finvalid.json'), {
            fetchFn: async () => ({
              ok: true,
              status: 200,
              json: async () => invalidScenePayload
            })
          })
      },
      {
        label: 'materialId',
        expectedSource: 'materialId',
        resolve: () =>
          resolveSceneSource(parseEmbedConfigFromSearch('?materialId=broken-material'), {
            materialResolver: async () => ({
              sceneData: invalidScenePayload
            })
          })
      }
    ] as const;

    for (const testCase of cases) {
      const result = await testCase.resolve();
      expect(result.ok, `${testCase.label} should fail validation`).toBe(false);
      if (result.ok) continue;
      expect(result.source).toBe(testCase.expectedSource);
      expect(result.code).toBe('validation');
      expect(result.message).toContain('version');
    }
  });

  it('forwards runtime validation detail through host loadScene command', () => {
    const store = useSimulatorStore();

    const result = executeHostCommand(
      {
        startRunning: () => {},
        stopRunning: () => {},
        toggleRunning: () => {},
        resetScene: () => {},
        loadSceneData: (data) => store.loadSceneData(data)
      },
      {
        source: 'electric-field-host',
        type: 'command',
        command: 'loadScene',
        payload: invalidScenePayload
      }
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('validation');
    expect(result.message).toContain('缺少版本信息');
    expect(store.statusText).toContain('缺少版本信息');
  });

  it('surfaces embed validation detail into bootstrap result and status text', async () => {
    const store = useSimulatorStore();
    const config = parseEmbedConfigFromSearch(`?sceneData=${encodedInvalidScenePayload}`);

    const result = await store.bootstrapFromEmbed(config);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('validation');
    expect(result.error).toContain('version');
    expect(store.statusText).toContain('version');
  });
});
