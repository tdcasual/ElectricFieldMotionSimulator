import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveToolEntry,
  getCreationOverrides,
  clearTangencyHintState,
  computePinchDistance,
  computeDemoPinchZoom
} from '../js/interactions/DragDropManager.js';
import {
  getObjectCircleBoundary,
  getObjectPointBoundary,
  buildTangencyCandidates
} from '../js/interactions/tangencyCandidates.js';
import { computeRectFromHandle } from '../js/interactions/geometryResize.js';

test('resolveToolEntry maps toolbar aliases', () => {
  const cap = resolveToolEntry('capacitor');
  assert.equal(cap.type, 'parallel-plate-capacitor');

  const semicircle = resolveToolEntry('electric-field-semicircle');
  assert.equal(semicircle.type, 'semicircle-electric-field');

  const magneticLong = resolveToolEntry('magnetic-field-long');
  assert.equal(magneticLong.type, 'magnetic-field-long');
});

test('getCreationOverrides applies pixels-per-meter scaling', () => {
  const overrides = getCreationOverrides('particle', 2);
  assert.equal(overrides.vx, 100);
});

test('getCreationOverrides returns empty overrides in demo mode', () => {
  const overrides = getCreationOverrides('particle', 2, { demoMode: true });
  assert.deepEqual(overrides, {});
});

test('getObjectCircleBoundary detects supported circle objects', () => {
  const electricCircle = getObjectCircleBoundary({
    x: 10,
    y: 20,
    geometry: {
      kind: 'circle',
      radius: 30
    }
  });
  assert.deepEqual(electricCircle, { x: 10, y: 20, radius: 30 });

  const magneticCircle = getObjectCircleBoundary({
    type: 'magnetic-field',
    x: 11,
    y: 22,
    geometry: {
      kind: 'circle',
      radius: 44
    }
  });
  assert.deepEqual(magneticCircle, { x: 11, y: 22, radius: 44 });

  const geometryCircle = getObjectCircleBoundary({
    x: 12,
    y: 24,
    geometry: {
      kind: 'circle',
      radius: 15
    }
  });
  assert.deepEqual(geometryCircle, { x: 12, y: 24, radius: 15 });

  const nonCircle = getObjectCircleBoundary({
    type: 'electric-field-rect',
    x: 0,
    y: 0,
    width: 100,
    height: 100
  });
  assert.equal(nonCircle, null);
});

test('buildTangencyCandidates supports unified polygon geometry objects', () => {
  const active = {
    id: 'active',
    x: 0,
    y: 0,
    geometry: {
      kind: 'circle',
      radius: 20
    }
  };
  const objects = [
    active,
    {
      id: 'poly1',
      x: 100,
      y: 100,
      geometry: {
        kind: 'polygon',
        vertices: [
          { x: 0, y: 0 },
          { x: 30, y: 0 },
          { x: 0, y: 40 }
        ]
      }
    }
  ];

  const candidates = buildTangencyCandidates(objects, active);
  const segments = candidates.filter((item) => item.kind === 'segment');
  assert.equal(segments.length, 3);
  assert.equal(segments.every((item) => item.objectId === 'poly1'), true);
});

test('getObjectPointBoundary detects emitter center point objects', () => {
  const electronGun = getObjectPointBoundary({
    type: 'electron-gun',
    x: 12,
    y: 34
  });
  assert.deepEqual(electronGun, { x: 12, y: 34 });

  const programmableEmitter = getObjectPointBoundary({
    type: 'programmable-emitter',
    x: 56,
    y: 78
  });
  assert.deepEqual(programmableEmitter, { x: 56, y: 78 });

  const notEmitter = getObjectPointBoundary({
    type: 'particle',
    x: 10,
    y: 20
  });
  assert.equal(notEmitter, null);
});

test('buildTangencyCandidates collects circles and boundary segments except active object', () => {
  const active = {
    id: 'active',
    x: 0,
    y: 0,
    geometry: { kind: 'circle', radius: 20 }
  };
  const objects = [
    active,
    {
      id: 'c1',
      type: 'magnetic-field',
      x: 100,
      y: 0,
      geometry: { kind: 'circle', radius: 50 }
    },
    { id: 'e1', type: 'programmable-emitter', x: 12, y: 34 },
    {
      id: 'r1',
      x: -20,
      y: -10,
      geometry: {
        kind: 'polygon',
        vertices: [
          { x: 0, y: 0 },
          { x: 40, y: 0 },
          { x: 40, y: 20 },
          { x: 0, y: 20 }
        ]
      }
    },
    {
      id: 't1',
      type: 'magnetic-field',
      x: 10,
      y: 20,
      geometry: {
        kind: 'polygon',
        vertices: [
          { x: 15, y: 0 },
          { x: 0, y: 20 },
          { x: 30, y: 20 }
        ]
      }
    },
    { id: 'l1', type: 'disappear-zone', x: 0, y: 0, length: 100, angle: 0, lineWidth: 6 }
  ];

  const candidates = buildTangencyCandidates(objects, active);
  const circleCount = candidates.filter((item) => item.kind === 'circle').length;
  const segmentCount = candidates.filter((item) => item.kind === 'segment').length;
  const pointCount = candidates.filter((item) => item.kind === 'point').length;

  assert.equal(circleCount, 1);
  assert.equal(segmentCount, 8);
  assert.equal(pointCount, 1);
  assert.equal(candidates.some((item) => item.objectId === 'active'), false);
});

test('clearTangencyHintState resets runtime hint safely', () => {
  const scene = {
    interaction: {
      tangencyHint: { kind: 'circle-circle' }
    }
  };
  clearTangencyHintState(scene);
  assert.equal(scene.interaction.tangencyHint, null);
});

test('computePinchDistance returns euclidean distance for two touch points', () => {
  const distance = computePinchDistance(
    { x: 0, y: 0 },
    { x: 3, y: 4 }
  );
  assert.equal(distance, 5);
});

test('computeDemoPinchZoom scales from pinch ratio and clamps to limits', () => {
  const scaled = computeDemoPinchZoom(1, 100, 150, { min: 0.5, max: 4 });
  assert.equal(scaled, 1.5);

  const minClamped = computeDemoPinchZoom(1, 100, 20, { min: 0.5, max: 4 });
  assert.equal(minClamped, 0.5);

  const maxClamped = computeDemoPinchZoom(2, 100, 300, { min: 0.5, max: 4 });
  assert.equal(maxClamped, 4);
});

test('computeDemoPinchZoom falls back to current zoom when pinch baseline is invalid', () => {
  const unchanged = computeDemoPinchZoom(1.25, 0, 140, { min: 0.5, max: 4 });
  assert.equal(unchanged, 1.25);
});

test('computeRectFromHandle computes constrained rect for nw handle drag', () => {
  const next = computeRectFromHandle(
    'nw',
    { x: 10, y: 20, width: 100, height: 80 },
    { x: -5, y: 0 },
    30
  );

  assert.deepEqual(next, {
    x: -5,
    y: 0,
    width: 115,
    height: 100
  });
});
