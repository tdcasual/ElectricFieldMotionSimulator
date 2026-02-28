import { validateSceneData } from '../io/sceneIO';
import type { SceneData } from '../io/sceneSchema';
import type { EmbedConfig } from './embedConfig';
import { resolveMockMaterial } from './materialMockRegistry';

type FetchResponseLike = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

type FetchLike = (input: string) => Promise<FetchResponseLike>;

type SceneSourceResult =
  | { ok: true; source: 'none'; data: null }
  | { ok: true; source: 'sceneData' | 'sceneUrl' | 'materialId'; data: SceneData }
  | {
      ok: false;
      source: 'sceneData' | 'sceneUrl' | 'materialId';
      code: 'network' | 'parse' | 'validation' | 'material-not-found' | 'material-resolver';
      message: string;
    };

type MaterialSource = {
  sceneUrl?: string | null;
  sceneData?: unknown;
};

type MaterialResolver = (materialId: string) => Promise<MaterialSource | null> | MaterialSource | null;

type ResolveOptions = {
  fetchFn?: FetchLike;
  materialResolver?: MaterialResolver;
};

function parseInlineSceneData(input: unknown): { ok: true; data: unknown } | { ok: false; message: string } {
  if (typeof input !== 'string') {
    return { ok: true, data: input };
  }
  try {
    return { ok: true, data: JSON.parse(input) };
  } catch {
    return { ok: false, message: 'Inline sceneData is not valid JSON.' };
  }
}

function resolveFetch(options?: ResolveOptions): FetchLike {
  if (options?.fetchFn) return options.fetchFn;
  const candidate = (globalThis as { fetch?: FetchLike }).fetch;
  if (typeof candidate === 'function') return candidate;
  return async () => {
    throw new Error('Fetch API is not available.');
  };
}

function normalizeSceneUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  return value.length > 0 ? value : null;
}

function resolveMaterialResolver(options?: ResolveOptions): MaterialResolver {
  if (options?.materialResolver) return options.materialResolver;
  return async (materialId: string) => resolveMockMaterial(materialId);
}

function validatePayload(
  source: 'sceneData' | 'sceneUrl' | 'materialId',
  payload: unknown
): SceneSourceResult {
  const validated = validateSceneData(payload);
  if (!validated.ok) {
    return {
      ok: false,
      source,
      code: 'validation',
      message: validated.error
    };
  }
  return {
    ok: true,
    source,
    data: validated.data
  };
}

async function resolveSceneFromUrl(
  source: 'sceneUrl' | 'materialId',
  sceneUrl: string,
  fetchFn: FetchLike
): Promise<SceneSourceResult> {
  try {
    const response = await fetchFn(sceneUrl);
    if (!response.ok) {
      return {
        ok: false,
        source,
        code: 'network',
        message: `Scene request failed with status ${response.status}.`
      };
    }
    const payload = await response.json();
    return validatePayload(source, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error';
    return {
      ok: false,
      source,
      code: 'network',
      message
    };
  }
}

export async function resolveSceneSource(config: EmbedConfig, options?: ResolveOptions): Promise<SceneSourceResult> {
  if (config.sceneData != null) {
    const parsed = parseInlineSceneData(config.sceneData);
    if (!parsed.ok) {
      return {
        ok: false,
        source: 'sceneData',
        code: 'parse',
        message: parsed.message
      };
    }
    return validatePayload('sceneData', parsed.data);
  }

  if (config.sceneUrl) {
    const fetchFn = resolveFetch(options);
    return resolveSceneFromUrl('sceneUrl', config.sceneUrl, fetchFn);
  }

  if (config.materialId) {
    const materialResolver = resolveMaterialResolver(options);
    let material: MaterialSource | null = null;
    try {
      material = await materialResolver(config.materialId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown material resolver error';
      return {
        ok: false,
        source: 'materialId',
        code: 'material-resolver',
        message
      };
    }

    if (!material) {
      return {
        ok: false,
        source: 'materialId',
        code: 'material-not-found',
        message: `Material not found: ${config.materialId}`
      };
    }

    if (material.sceneData != null) {
      return validatePayload('materialId', material.sceneData);
    }

    const materialSceneUrl = normalizeSceneUrl(material.sceneUrl);
    if (!materialSceneUrl) {
      return {
        ok: false,
        source: 'materialId',
        code: 'validation',
        message: `Material payload is missing scene data: ${config.materialId}`
      };
    }

    const fetchFn = resolveFetch(options);
    return resolveSceneFromUrl('materialId', materialSceneUrl, fetchFn);
  }

  return {
    ok: true,
    source: 'none',
    data: null
  };
}
