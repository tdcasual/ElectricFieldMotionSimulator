import { normalizeLocalVertices } from './VertexGeometry.js';

function isFinitePositive(value) {
  return Number.isFinite(value) && value > 0;
}

function resolveGeometrySource(source) {
  if (!source || typeof source !== 'object') return null;
  if (typeof source.kind === 'string') return source;
  if (source.geometry && typeof source.geometry === 'object') return source.geometry;
  return null;
}

export function normalizePositiveDimension(value, fallback = 1) {
  const numeric = Number(value);
  return isFinitePositive(numeric) ? numeric : fallback;
}

export function buildRectPolygon(width, height) {
  const w = normalizePositiveDimension(width, 1);
  const h = normalizePositiveDimension(height, 1);
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h }
  ];
}

export function normalizeGeometryContract(source, options = {}) {
  const geometry = resolveGeometrySource(source);
  if (!geometry) return null;

  const allowCircle = options.allowCircle !== false;
  const allowPolygon = options.allowPolygon !== false;
  if (allowCircle && geometry.kind === 'circle') {
    const radius = Number(geometry.radius);
    if (!isFinitePositive(radius)) return null;
    return { kind: 'circle', radius };
  }

  if (allowPolygon && geometry.kind === 'polygon') {
    const vertices = normalizeLocalVertices(geometry.vertices);
    if (!vertices) return null;
    return {
      kind: 'polygon',
      vertices: vertices.map((point) => ({ x: point.x, y: point.y }))
    };
  }

  return null;
}

export function resolveGeometryContract(source, fallbackGeometry = null, options = {}) {
  const fromSource = normalizeGeometryContract(source, options);
  if (fromSource) return fromSource;
  return normalizeGeometryContract(fallbackGeometry, options);
}

export function resolveCircleRadius(source, fallback = 100) {
  const geometry = resolveGeometryContract(source, null, { allowCircle: true, allowPolygon: false });
  if (geometry?.kind === 'circle') return geometry.radius;
  return fallback;
}
