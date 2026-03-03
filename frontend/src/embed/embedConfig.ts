export type EmbedMode = 'edit' | 'view';

export type EmbedConfig = {
  mode: EmbedMode;
  autoplay: boolean;
  sceneUrl: string | null;
  sceneData: unknown | null;
  materialId: string | null;
};

function firstNonEmpty(params: URLSearchParams, keys: string[]): string | null {
  for (const key of keys) {
    const raw = params.get(key);
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim();
    }
  }
  return null;
}

function parseMode(raw: string | null): EmbedMode {
  return raw === 'view' ? 'view' : 'edit';
}

function parseBoolean(raw: string | null, fallback: boolean): boolean {
  if (raw == null) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseSceneData(raw: string | null): unknown | null {
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function stripLeadingQuestionMark(search: string) {
  return search.startsWith('?') ? search.slice(1) : search;
}

export function parseEmbedConfigFromSearch(search: string): EmbedConfig {
  const params = new URLSearchParams(stripLeadingQuestionMark(String(search || '')));

  const mode = parseMode(firstNonEmpty(params, ['mode']));
  const sceneData = parseSceneData(firstNonEmpty(params, ['sceneData']));
  let sceneUrl = firstNonEmpty(params, ['sceneUrl']);
  let materialId = firstNonEmpty(params, ['materialId']);

  if (sceneData != null) {
    sceneUrl = null;
    materialId = null;
  } else if (sceneUrl != null) {
    materialId = null;
  }

  return {
    mode,
    autoplay: parseBoolean(firstNonEmpty(params, ['autoplay']), false),
    sceneUrl,
    sceneData,
    materialId
  };
}
