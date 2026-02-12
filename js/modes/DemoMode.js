export const DEMO_BASE_PIXELS_PER_UNIT = 50;
export const DEMO_MIN_ZOOM = 0.1;
export const DEMO_MAX_ZOOM = 20;
export const DEMO_ZOOM_STEP = 1.1;

const DEMO_PX_DEFAULT_KEYS = new Set([
  'x',
  'y',
  'vx',
  'vy',
  'width',
  'height',
  'radius',
  'length',
  'plateDistance',
  'barrelLength',
  'depth',
  'viewGap',
  'spotSize',
  'lineWidth',
  'particleRadius',
  'emissionSpeed',
  'speedMin',
  'speedMax'
]);

const DEMO_PX_ARRAY_KEYS = new Set(['speedList']);

const ZOOM_DIMENSION_KEYS = [
  'width',
  'height',
  'radius',
  'length',
  'plateDistance',
  'barrelLength',
  'depth',
  'viewGap',
  'spotSize',
  'lineWidth',
  'particleRadius'
];

const ZOOM_SPEED_KEYS = ['emissionSpeed', 'speedMin', 'speedMax'];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scaleAroundAnchor(value, anchor, factor) {
  return anchor + (value - anchor) * factor;
}

function scaleLinear(value, factor) {
  return Number.isFinite(value) ? value * factor : value;
}

function scaleNumericField(object, key, factor) {
  if (!Number.isFinite(object?.[key])) return;
  object[key] *= factor;
}

function scaleObjectForZoom(object, factor, anchorX, anchorY) {
  if (!object || typeof object !== 'object') return;

  const hasVectorPosition = Number.isFinite(object.position?.x) && Number.isFinite(object.position?.y);
  if (hasVectorPosition) {
    object.position.x = scaleAroundAnchor(object.position.x, anchorX, factor);
    object.position.y = scaleAroundAnchor(object.position.y, anchorY, factor);
    object.x = object.position.x;
    object.y = object.position.y;
  } else {
    if (Number.isFinite(object.x)) object.x = scaleAroundAnchor(object.x, anchorX, factor);
    if (Number.isFinite(object.y)) object.y = scaleAroundAnchor(object.y, anchorY, factor);
  }

  const hasVectorVelocity = Number.isFinite(object.velocity?.x) && Number.isFinite(object.velocity?.y);
  if (hasVectorVelocity) {
    object.velocity.x *= factor;
    object.velocity.y *= factor;
  } else {
    if (Number.isFinite(object.vx)) object.vx *= factor;
    if (Number.isFinite(object.vy)) object.vy *= factor;
  }

  for (const key of ZOOM_DIMENSION_KEYS) {
    scaleNumericField(object, key, factor);
  }

  for (const key of ZOOM_SPEED_KEYS) {
    scaleNumericField(object, key, factor);
  }

  if (Array.isArray(object.speedList)) {
    object.speedList = object.speedList.map(value => scaleLinear(value, factor));
  }

  if (Array.isArray(object.trajectory)) {
    object.trajectory = object.trajectory.map(point => {
      if (!point || typeof point !== 'object') return point;
      return {
        ...point,
        x: Number.isFinite(point.x) ? scaleAroundAnchor(point.x, anchorX, factor) : point.x,
        y: Number.isFinite(point.y) ? scaleAroundAnchor(point.y, anchorY, factor) : point.y
      };
    });
  }

  if (Array.isArray(object.hits)) {
    object.hits = object.hits.map(hit => {
      if (!hit || typeof hit !== 'object') return hit;
      return {
        ...hit,
        x: scaleLinear(hit.x, factor),
        y: scaleLinear(hit.y, factor)
      };
    });
  }
}

function scaleDemoDefaultsByKey(value, key, pixelsPerMeter) {
  if (Array.isArray(value)) {
    if (key && DEMO_PX_ARRAY_KEYS.has(key)) {
      return value.map(item => (Number.isFinite(item) ? item * pixelsPerMeter : item));
    }
    return value.map(item => scaleDemoDefaultsByKey(item, null, pixelsPerMeter));
  }

  if (value && typeof value === 'object') {
    const output = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      output[childKey] = scaleDemoDefaultsByKey(childValue, childKey, pixelsPerMeter);
    }
    return output;
  }

  if (Number.isFinite(value) && key && DEMO_PX_DEFAULT_KEYS.has(key)) {
    return value * pixelsPerMeter;
  }

  return value;
}

function getPixelsPerMeter(scene) {
  const value = scene?.settings?.pixelsPerMeter;
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function isDemoMode(scene) {
  return scene?.settings?.mode === 'demo';
}

export function normalizeDemoDefaults(value) {
  if (Array.isArray(value)) {
    return value.map(item => normalizeDemoDefaults(item));
  }

  if (value && typeof value === 'object') {
    const output = {};
    for (const [key, child] of Object.entries(value)) {
      output[key] = normalizeDemoDefaults(child);
    }
    return output;
  }

  if (Number.isFinite(value)) {
    return 1;
  }

  return value;
}

export function buildDemoCreationOverrides(entry, pixelsPerMeter) {
  const ppm = Number.isFinite(pixelsPerMeter) && pixelsPerMeter > 0
    ? pixelsPerMeter
    : DEMO_BASE_PIXELS_PER_UNIT;

  const defaults = typeof entry?.defaults === 'function'
    ? entry.defaults()
    : {};

  const normalized = normalizeDemoDefaults(defaults);

  if (Object.prototype.hasOwnProperty.call(normalized, 'ignoreGravity')) {
    normalized.ignoreGravity = true;
  }

  return scaleDemoDefaultsByKey(normalized, null, ppm);
}

export function getNextDemoZoom(currentZoom, deltaY, options = {}) {
  const step = Number.isFinite(options.step) && options.step > 1
    ? options.step
    : DEMO_ZOOM_STEP;
  const min = Number.isFinite(options.min) && options.min > 0
    ? options.min
    : DEMO_MIN_ZOOM;
  const max = Number.isFinite(options.max) && options.max > min
    ? options.max
    : DEMO_MAX_ZOOM;
  const now = Number.isFinite(currentZoom) && currentZoom > 0 ? currentZoom : 1;

  const factor = deltaY < 0 ? step : 1 / step;
  return clamp(now * factor, min, max);
}

export function applyDemoZoomToScene(scene, { newPixelsPerMeter, anchorX = 0, anchorY = 0 } = {}) {
  if (!scene || !scene.settings) return false;

  const next = Number(newPixelsPerMeter);
  if (!Number.isFinite(next) || next <= 0) return false;

  const old = getPixelsPerMeter(scene);
  const factor = next / old;
  if (!Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 1e-12) {
    scene.settings.pixelsPerMeter = next;
    return false;
  }

  const ax = Number.isFinite(anchorX) ? anchorX : 0;
  const ay = Number.isFinite(anchorY) ? anchorY : 0;

  const objects = Array.isArray(scene.objects) ? scene.objects : [];
  for (const object of objects) {
    scaleObjectForZoom(object, factor, ax, ay);
  }

  if (Number.isFinite(scene.settings.boundaryMargin)) {
    scene.settings.boundaryMargin *= factor;
  }

  scene.settings.pixelsPerMeter = next;
  return true;
}
