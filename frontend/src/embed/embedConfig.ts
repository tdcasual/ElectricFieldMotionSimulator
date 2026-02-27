export type EmbedMode = 'edit' | 'view';

export type EmbedConfig = {
  mode: EmbedMode;
  toolbar: boolean;
  autoplay: boolean;
  sceneUrl: string | null;
  sceneData: unknown | null;
  materialId: string | null;
  theme: string | null;
  locale: string | null;
  width: number | null;
  height: number | null;
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

function parseOptionalNumber(raw: string | null): number | null {
  if (raw == null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
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

  const mode = parseMode(firstNonEmpty(params, ['mode', 'm']));
  const sceneData = parseSceneData(firstNonEmpty(params, ['sceneData', 'scene_data', 'ggbBase64']));
  let sceneUrl = firstNonEmpty(params, ['sceneUrl', 'scene', 'filename']);
  let materialId = firstNonEmpty(params, ['materialId', 'material_id', 'mid', 'id']);

  if (sceneData != null) {
    sceneUrl = null;
    materialId = null;
  } else if (sceneUrl != null) {
    materialId = null;
  }

  return {
    mode,
    toolbar: parseBoolean(firstNonEmpty(params, ['toolbar']), mode !== 'view'),
    autoplay: parseBoolean(firstNonEmpty(params, ['autoplay']), false),
    sceneUrl,
    sceneData,
    materialId,
    theme: firstNonEmpty(params, ['theme']),
    locale: firstNonEmpty(params, ['locale', 'lang']),
    width: parseOptionalNumber(firstNonEmpty(params, ['width'])),
    height: parseOptionalNumber(firstNonEmpty(params, ['height']))
  };
}
