import {
  getGeometryBoundarySegments,
  getGeometryCircleBoundary
} from '../geometry/GeometryKernel.js';

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function isFinitePositive(value) {
  return Number.isFinite(value) && value > 0;
}

function buildDisappearZoneSegment(object) {
  if (object?.type !== 'disappear-zone') return null;
  const length = object.length;
  const angle = object.angle;
  if (!isFinitePositive(length) || !isFiniteNumber(angle) || !isFiniteNumber(object.x) || !isFiniteNumber(object.y)) {
    return null;
  }

  const rad = angle * Math.PI / 180;
  const half = length / 2;
  const dx = Math.cos(rad) * half;
  const dy = Math.sin(rad) * half;
  return { x1: object.x - dx, y1: object.y - dy, x2: object.x + dx, y2: object.y + dy };
}

function objectBoundarySegments(object) {
  if (!object) return [];
  const geometrySegments = getGeometryBoundarySegments(object);
  if (geometrySegments.length) return geometrySegments;

  const zoneSegment = buildDisappearZoneSegment(object);
  if (zoneSegment) return [zoneSegment];
  return [];
}

export function getObjectCircleBoundary(object) {
  return getGeometryCircleBoundary(object);
}

export function getObjectPointBoundary(object) {
  if (!object) return null;
  const isEmitter = object.type === 'electron-gun' || object.type === 'programmable-emitter';
  if (!isEmitter) return null;
  if (!isFiniteNumber(object.x) || !isFiniteNumber(object.y)) return null;
  return { x: object.x, y: object.y };
}

export function buildTangencyCandidates(objects, activeObject) {
  if (!Array.isArray(objects)) return [];
  const candidates = [];
  for (const object of objects) {
    if (!object) continue;
    if (object === activeObject) continue;
    if (activeObject?.id && object?.id && object.id === activeObject.id) continue;

    const circle = getObjectCircleBoundary(object);
    if (circle) {
      candidates.push({
        kind: 'circle',
        x: circle.x,
        y: circle.y,
        radius: circle.radius,
        objectId: object.id ?? null,
        objectRef: object
      });
      continue;
    }

    const point = getObjectPointBoundary(object);
    if (point) {
      candidates.push({
        kind: 'point',
        x: point.x,
        y: point.y,
        objectId: object.id ?? null,
        objectRef: object
      });
      continue;
    }

    const segments = objectBoundarySegments(object);
    for (const segment of segments) {
      candidates.push({
        kind: 'segment',
        x1: segment.x1,
        y1: segment.y1,
        x2: segment.x2,
        y2: segment.y2,
        objectId: object.id ?? null,
        objectRef: object
      });
    }
  }
  return candidates;
}
