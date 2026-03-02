import { computeVertexBounds } from '../geometry/VertexGeometry.js';
import {
  getGeometryCircleBoundary,
  getGeometryWorldVertices
} from '../geometry/GeometryKernel.js';

export function tracePolygonPath(ctx, polygonVertices) {
  if (!ctx || !Array.isArray(polygonVertices) || polygonVertices.length === 0) return false;
  ctx.beginPath();
  ctx.moveTo(polygonVertices[0].x, polygonVertices[0].y);
  for (let i = 1; i < polygonVertices.length; i += 1) {
    ctx.lineTo(polygonVertices[i].x, polygonVertices[i].y);
  }
  if (typeof ctx.closePath === 'function') {
    ctx.closePath();
  } else {
    ctx.lineTo(polygonVertices[0].x, polygonVertices[0].y);
  }
  return true;
}

export function buildUniformElectricGeometry(field) {
  const circleBoundary = getGeometryCircleBoundary(field);
  const polygonVertices = circleBoundary ? [] : getGeometryWorldVertices(field);
  const polygonBounds = polygonVertices.length ? computeVertexBounds(polygonVertices) : null;

  const bounds = (() => {
    if (circleBoundary) {
      return {
        minX: circleBoundary.x - circleBoundary.radius,
        minY: circleBoundary.y - circleBoundary.radius,
        maxX: circleBoundary.x + circleBoundary.radius,
        maxY: circleBoundary.y + circleBoundary.radius
      };
    }
    if (polygonBounds) return { ...polygonBounds };
    return null;
  })();

  return {
    kind: circleBoundary ? 'circle' : (polygonBounds ? 'polygon' : 'none'),
    bounds,
    circleBoundary,
    polygonVertices,
    polygonBounds
  };
}

export function buildMagneticGeometryPath(ctx, field) {
  if (!ctx) return null;

  const circleBoundary = getGeometryCircleBoundary(field);
  const polygonVertices = circleBoundary ? [] : getGeometryWorldVertices(field);
  const hasExplicitGeometry = field?.geometry && typeof field.geometry === 'object';

  if (circleBoundary) {
    const r = Math.max(0, circleBoundary.radius ?? 0);
    ctx.beginPath();
    ctx.arc(circleBoundary.x, circleBoundary.y, r, 0, Math.PI * 2);
    return {
      minX: circleBoundary.x - r,
      minY: circleBoundary.y - r,
      maxX: circleBoundary.x + r,
      maxY: circleBoundary.y + r
    };
  }

  const polygonBounds = computeVertexBounds(polygonVertices);
  if (polygonVertices.length && polygonBounds) {
    tracePolygonPath(ctx, polygonVertices);
    return { ...polygonBounds };
  }

  if (hasExplicitGeometry) return null;

  const x = Number.isFinite(field?.x) ? field.x : 0;
  const y = Number.isFinite(field?.y) ? field.y : 0;
  const w = Number.isFinite(field?.width) ? field.width : 0;
  const h = Number.isFinite(field?.height) ? field.height : 0;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  return { minX: x, minY: y, maxX: x + w, maxY: y + h };
}
