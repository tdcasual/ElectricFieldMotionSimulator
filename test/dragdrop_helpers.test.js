import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveToolEntry,
  getCreationOverrides,
  getObjectCircleBoundary,
  getObjectPointBoundary,
  buildTangencyCandidates,
  clearTangencyHintState
} from '../js/interactions/DragDropManager.js';

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
    type: 'electric-field-circle',
    x: 10,
    y: 20,
    radius: 30
  });
  assert.deepEqual(electricCircle, { x: 10, y: 20, radius: 30 });

  const magneticCircle = getObjectCircleBoundary({
    type: 'magnetic-field-circle',
    shape: 'circle',
    x: 11,
    y: 22,
    radius: 44
  });
  assert.deepEqual(magneticCircle, { x: 11, y: 22, radius: 44 });

  const nonCircle = getObjectCircleBoundary({
    type: 'electric-field-rect',
    x: 0,
    y: 0,
    width: 100,
    height: 100
  });
  assert.equal(nonCircle, null);
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
  const active = { id: 'active', type: 'electric-field-circle', x: 0, y: 0, radius: 20 };
  const objects = [
    active,
    { id: 'c1', type: 'magnetic-field-circle', shape: 'circle', x: 100, y: 0, radius: 50 },
    { id: 'e1', type: 'programmable-emitter', x: 12, y: 34 },
    { id: 'r1', type: 'electric-field-rect', x: -20, y: -10, width: 40, height: 20 },
    { id: 't1', type: 'magnetic-field-triangle', shape: 'triangle', x: 10, y: 20, width: 30, height: 20 },
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
