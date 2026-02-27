import { validateSceneData } from '../io/sceneIO';
import type { SceneData } from '../io/sceneSchema';
import type { EmbedConfig } from './embedConfig';

type FetchResponseLike = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

type FetchLike = (input: string) => Promise<FetchResponseLike>;

export type SceneSourceResult =
  | { ok: true; source: 'none'; data: null }
  | { ok: true; source: 'sceneData' | 'sceneUrl'; data: SceneData }
  | {
      ok: false;
      source: 'sceneData' | 'sceneUrl';
      code: 'network' | 'parse' | 'validation';
      message: string;
    };

type ResolveOptions = {
  fetchFn?: FetchLike;
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
    const validated = validateSceneData(parsed.data);
    if (!validated.ok) {
      return {
        ok: false,
        source: 'sceneData',
        code: 'validation',
        message: validated.error
      };
    }
    return {
      ok: true,
      source: 'sceneData',
      data: validated.data
    };
  }

  if (config.sceneUrl) {
    const fetchFn = resolveFetch(options);
    try {
      const response = await fetchFn(config.sceneUrl);
      if (!response.ok) {
        return {
          ok: false,
          source: 'sceneUrl',
          code: 'network',
          message: `Scene request failed with status ${response.status}.`
        };
      }
      const payload = await response.json();
      const validated = validateSceneData(payload);
      if (!validated.ok) {
        return {
          ok: false,
          source: 'sceneUrl',
          code: 'validation',
          message: validated.error
        };
      }
      return {
        ok: true,
        source: 'sceneUrl',
        data: validated.data
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown network error';
      return {
        ok: false,
        source: 'sceneUrl',
        code: 'network',
        message
      };
    }
  }

  return {
    ok: true,
    source: 'none',
    data: null
  };
}
