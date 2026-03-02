import test from 'node:test';
import assert from 'node:assert/strict';
import {
  geometryContainsPoint,
  getGeometryBoundarySegments,
  getGeometryBounds,
  getGeometryCircleBoundary,
  getGeometryHandles,
  getGeometryWorldVertices,
  resolveObjectGeometry
} from '../js/geometry/GeometryKernel.js';

test('geometry kernel polygon contract covers hit test, segments, bounds and handles', () => {
  const polygonObject = {
    x: 10,
    y: 20,
    geometry: {
      kind: 'polygon',
      vertices: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 20, y: 30 }
      ]
    }
  };

  assert.equal(geometryContainsPoint(polygonObject, 30, 30), true);
  assert.equal(geometryContainsPoint(polygonObject, 5, 10), false);

  const segments = getGeometryBoundarySegments(polygonObject);
  assert.equal(segments.length, 3);
  assert.deepEqual(segments[0], { x1: 10, y1: 20, x2: 50, y2: 20 });

  const bounds = getGeometryBounds(polygonObject);
  assert.deepEqual(bounds, { minX: 10, maxX: 50, minY: 20, maxY: 50 });

  const handles = getGeometryHandles(polygonObject);
  assert.equal(handles.length, 3);
  assert.deepEqual(handles[0], { kind: 'vertex', index: 0, x: 10, y: 20 });
});

test('geometry kernel circle contract covers hit test, segments, bounds and handles', () => {
  const circleObject = {
    x: 90,
    y: 100,
    geometry: {
      kind: 'circle',
      radius: 25
    }
  };

  const circle = getGeometryCircleBoundary(circleObject);
  assert.deepEqual(circle, { x: 90, y: 100, radius: 25 });

  assert.equal(geometryContainsPoint(circleObject, 105, 100), true);
  assert.equal(geometryContainsPoint(circleObject, 140, 100), false);

  const segments = getGeometryBoundarySegments(circleObject, { circleSegments: 8 });
  assert.equal(segments.length, 8);
  assert.ok(Math.abs(segments[0].x1 - 115) < 1e-9);
  assert.ok(Math.abs(segments[0].y1 - 100) < 1e-9);

  const bounds = getGeometryBounds(circleObject);
  assert.deepEqual(bounds, { minX: 65, maxX: 115, minY: 75, maxY: 125 });

  const handles = getGeometryHandles(circleObject);
  assert.deepEqual(handles, [{ kind: 'radius', index: 0, x: 115, y: 100 }]);
});

test('geometry kernel resolves object geometry contract and rejects shape-only legacy fallback', () => {
  const triangleObject = {
    x: 100,
    y: 200,
    getGeometry() {
      return {
        kind: 'polygon',
        vertices: [
          { x: 30, y: 0 },
          { x: 0, y: 40 },
          { x: 60, y: 40 }
        ]
      };
    }
  };

  const resolved = resolveObjectGeometry(triangleObject);
  assert.equal(resolved?.kind, 'polygon');
  assert.equal(resolved?.vertices.length, 3);

  const worldVertices = getGeometryWorldVertices(triangleObject);
  assert.deepEqual(worldVertices[0], { x: 130, y: 200 });

  const segments = getGeometryBoundarySegments(triangleObject);
  assert.equal(segments.length, 3);

  const legacyShapeOnly = {
    type: 'magnetic-field',
    shape: 'triangle',
    x: 100,
    y: 200,
    width: 60,
    height: 40
  };
  assert.equal(resolveObjectGeometry(legacyShapeOnly), null);
});
