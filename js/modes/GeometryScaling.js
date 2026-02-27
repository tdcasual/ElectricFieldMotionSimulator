export const GEOMETRY_DIMENSION_KEYS = [
  'width',
  'height',
  'radius',
  'length',
  'plateDistance',
  'depth',
  'viewGap',
  'spotSize',
  'lineWidth',
  'particleRadius',
  'barrelLength'
];

const GEOMETRY_DIMENSION_KEY_SET = new Set(GEOMETRY_DIMENSION_KEYS);
export const REAL_STORE_KEY = '__geometryReal';
export const OBJECT_SCALE_KEY = '__geometryObjectScale';
const REAL_DECIMALS = 2;

function roundTo(value, decimals = REAL_DECIMALS) {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function isFinitePositive(value) {
  return Number.isFinite(value) && value > 0;
}

function getOrCreateRealStore(object) {
  if (!object || typeof object !== 'object') return null;
  const existing = object[REAL_STORE_KEY];
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    return existing;
  }
  const store = {};
  object[REAL_STORE_KEY] = store;
  return store;
}

function normalizeObjectScale(object) {
  if (!object || typeof object !== 'object') return 1;
  const current = Number(object[OBJECT_SCALE_KEY]);
  const normalized = isFinitePositive(current) ? current : 1;
  object[OBJECT_SCALE_KEY] = normalized;
  return normalized;
}

export function isGeometryDimensionKey(key) {
  return GEOMETRY_DIMENSION_KEY_SET.has(String(key ?? ''));
}

export function getSceneGeometryScale(scene) {
  const value = Number(scene?.settings?.pixelsPerMeter);
  return isFinitePositive(value) ? value : 1;
}

export function getObjectGeometryScale(object) {
  const value = Number(object?.[OBJECT_SCALE_KEY]);
  return isFinitePositive(value) ? value : 1;
}

export function ensureObjectGeometryState(object, scene) {
  if (!object || typeof object !== 'object') return null;
  const store = getOrCreateRealStore(object);
  if (!store) return null;

  const sceneScale = getSceneGeometryScale(scene);
  const objectScale = normalizeObjectScale(object);
  const divisor = sceneScale * objectScale;
  if (!isFinitePositive(divisor)) return store;

  for (const key of GEOMETRY_DIMENSION_KEYS) {
    if (Number.isFinite(store[key])) continue;
    const displayValue = Number(object[key]);
    if (!Number.isFinite(displayValue)) continue;
    store[key] = roundTo(displayValue / divisor);
  }

  return store;
}

export function captureObjectRealGeometry(object, scene) {
  if (!object || typeof object !== 'object') return false;
  const store = getOrCreateRealStore(object);
  if (!store) return false;

  const sceneScale = getSceneGeometryScale(scene);
  const objectScale = normalizeObjectScale(object);
  const divisor = sceneScale * objectScale;
  if (!isFinitePositive(divisor)) return false;

  let changed = false;
  for (const key of GEOMETRY_DIMENSION_KEYS) {
    const displayValue = Number(object[key]);
    if (!Number.isFinite(displayValue)) continue;
    const nextReal = roundTo(displayValue / divisor);
    if (!Number.isFinite(nextReal)) continue;
    if (store[key] !== nextReal) {
      store[key] = nextReal;
      changed = true;
    }
  }
  return changed;
}

export function syncObjectDisplayGeometry(object, scene) {
  const store = ensureObjectGeometryState(object, scene);
  if (!store) return false;

  const sceneScale = getSceneGeometryScale(scene);
  const objectScale = getObjectGeometryScale(object);
  const factor = sceneScale * objectScale;
  if (!isFinitePositive(factor)) return false;

  let changed = false;
  for (const key of GEOMETRY_DIMENSION_KEYS) {
    const real = Number(store[key]);
    if (!Number.isFinite(real)) continue;
    const next = roundTo(real * factor);
    if (!Number.isFinite(next)) continue;
    if (object[key] !== next) {
      object[key] = next;
      changed = true;
    }
  }

  return changed;
}

export function syncSceneDisplayGeometry(scene) {
  const objects = Array.isArray(scene?.objects) ? scene.objects : [];
  let changed = false;
  for (const object of objects) {
    if (syncObjectDisplayGeometry(object, scene)) {
      changed = true;
    }
  }
  return changed;
}

export function ensureSceneGeometryState(scene) {
  const objects = Array.isArray(scene?.objects) ? scene.objects : [];
  for (const object of objects) {
    ensureObjectGeometryState(object, scene);
  }
}

export function getObjectRealDimension(object, key, scene) {
  if (!isGeometryDimensionKey(key)) return null;
  const store = ensureObjectGeometryState(object, scene);
  if (!store) return null;
  const value = Number(store[key]);
  return Number.isFinite(value) ? value : null;
}

export function setObjectRealDimension(object, key, realValue, scene) {
  if (!isGeometryDimensionKey(key)) return false;
  if (!object || typeof object !== 'object') return false;

  const next = Number(realValue);
  if (!Number.isFinite(next) || next < 0) return false;

  const store = ensureObjectGeometryState(object, scene);
  if (!store) return false;
  store[key] = roundTo(next);
  syncObjectDisplayGeometry(object, scene);
  return true;
}

export function setObjectDisplayDimension(object, key, displayValue, scene) {
  if (!isGeometryDimensionKey(key)) return false;
  if (!object || typeof object !== 'object') return false;

  const nextDisplay = Number(displayValue);
  if (!isFinitePositive(nextDisplay)) return false;

  const store = ensureObjectGeometryState(object, scene);
  if (!store) return false;

  const realValue = Number(store[key]);
  const sceneScale = getSceneGeometryScale(scene);
  if (!isFinitePositive(realValue) || !isFinitePositive(sceneScale)) return false;

  const nextScale = nextDisplay / (realValue * sceneScale);
  if (!isFinitePositive(nextScale)) return false;

  object[OBJECT_SCALE_KEY] = nextScale;
  syncObjectDisplayGeometry(object, scene);
  return true;
}
