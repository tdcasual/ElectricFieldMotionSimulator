import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRectPolygon,
  resolveCircleRadius,
  resolveGeometryContract
} from '../js/geometry/ObjectGeometryUtils.js';

test('buildRectPolygon clamps invalid dimensions to minimum size', () => {
  const vertices = buildRectPolygon(0, Number.NaN);
  assert.deepEqual(vertices, [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ]);
});

test('resolveCircleRadius reads radius from geometry contract only', () => {
  const fromGeometry = resolveCircleRadius({
    geometry: {
      kind: 'circle',
      radius: 80
    }
  }, 100);
  assert.equal(fromGeometry, 80);

  const legacyIgnored = resolveCircleRadius({ radius: 999 }, 100);
  assert.equal(legacyIgnored, 100);
});

test('resolveGeometryContract normalizes polygon geometry from source payload', () => {
  const geometry = resolveGeometryContract({
    geometry: {
      kind: 'polygon',
      vertices: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 10 },
        { x: 0, y: 10 }
      ]
    }
  });

  assert.equal(geometry?.kind, 'polygon');
  assert.equal(Array.isArray(geometry?.vertices), true);
  assert.equal(geometry?.vertices?.length, 4);
});

test('resolveGeometryContract uses fallback geometry when source is missing', () => {
  const geometry = resolveGeometryContract(
    {},
    {
      kind: 'circle',
      radius: 55
    }
  );

  assert.deepEqual(geometry, {
    kind: 'circle',
    radius: 55
  });
});
