import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCircleCircleTangency,
  evaluateCirclePointTangency,
  evaluateCircleSegmentTangency,
  evaluatePointCircleTangency,
  evaluatePointSegmentTangency,
  pickBestTangencyMatch,
  computeTangencyMatch,
  computePointTangencyMatch
} from '../js/interactions/TangencyEngine.js';

test('evaluateCircleCircleTangency detects outer tangency within tolerance', () => {
  const match = evaluateCircleCircleTangency(
    { x: 0, y: 0, radius: 20 },
    { kind: 'circle', x: 52, y: 0, radius: 30, objectId: 'c1' },
    2,
    'move'
  );

  assert.equal(match?.relation, 'outer');
  assert.equal(match?.kind, 'circle-circle');
  assert.equal(match?.candidate.objectId, 'c1');
  assert.equal(match?.errorPx, 2);
});

test('evaluateCircleCircleTangency detects inner tangency within tolerance', () => {
  const match = evaluateCircleCircleTangency(
    { x: 0, y: 0, radius: 30 },
    { kind: 'circle', x: 22, y: 0, radius: 10, objectId: 'c2' },
    2,
    'move'
  );

  assert.equal(match?.relation, 'inner');
  assert.equal(match?.kind, 'circle-circle');
  assert.equal(match?.errorPx, 2);
});

test('evaluateCircleSegmentTangency detects circle-line tangency within tolerance', () => {
  const match = evaluateCircleSegmentTangency(
    { x: 0, y: 0, radius: 20 },
    { kind: 'segment', x1: -50, y1: 19, x2: 50, y2: 19, objectId: 's1' },
    2,
    'move'
  );

  assert.equal(match?.kind, 'circle-segment');
  assert.equal(match?.errorPx, 1);
  assert.equal(match?.candidate.objectId, 's1');
});

test('pickBestTangencyMatch prefers lower error then lower movement', () => {
  const match = pickBestTangencyMatch([
    { kind: 'circle-segment', errorPx: 1, movementPx: 5, candidate: { objectId: 'a' } },
    { kind: 'circle-circle', errorPx: 0.5, movementPx: 20, candidate: { objectId: 'b' } },
    { kind: 'circle-circle', errorPx: 0.5, movementPx: 2, candidate: { objectId: 'c' } }
  ]);

  assert.equal(match?.candidate.objectId, 'c');
});

test('computeTangencyMatch returns null for empty candidate list', () => {
  const match = computeTangencyMatch(
    { x: 0, y: 0, radius: 20 },
    [],
    2,
    'move'
  );
  assert.equal(match, null);
});

test('evaluateCirclePointTangency detects emitter-point contact with circle boundary', () => {
  const match = evaluateCirclePointTangency(
    { x: 151, y: 100, radius: 50 },
    { kind: 'point', x: 100, y: 100, objectId: 'p1' },
    2,
    'move'
  );

  assert.equal(match?.kind, 'circle-point');
  assert.equal(match?.errorPx, 1);
  assert.equal(match?.candidate.objectId, 'p1');
});

test('computeTangencyMatch supports point candidates for reverse matching', () => {
  const match = computeTangencyMatch(
    { x: 151, y: 100, radius: 50 },
    [{ kind: 'point', x: 100, y: 100, objectId: 'p2' }],
    2,
    'move'
  );

  assert.equal(match?.kind, 'circle-point');
  assert.equal(match?.candidate.objectId, 'p2');
});

test('evaluatePointSegmentTangency detects contact with boundary segment', () => {
  const match = evaluatePointSegmentTangency(
    { x: 40, y: 51 },
    { kind: 'segment', x1: 0, y1: 50, x2: 100, y2: 50, objectId: 's2' },
    2
  );

  assert.equal(match?.kind, 'point-segment');
  assert.equal(match?.errorPx, 1);
  assert.equal(match?.candidate.objectId, 's2');
  assert.equal(match?.snapTarget.x, 40);
  assert.equal(match?.snapTarget.y, 50);
});

test('evaluatePointCircleTangency detects contact with circle boundary', () => {
  const match = evaluatePointCircleTangency(
    { x: 131, y: 100 },
    { kind: 'circle', x: 100, y: 100, radius: 30, objectId: 'c3' },
    2
  );

  assert.equal(match?.kind, 'point-circle');
  assert.equal(match?.errorPx, 1);
  assert.equal(match?.candidate.objectId, 'c3');
  assert.equal(match?.snapTarget.x, 130);
  assert.equal(match?.snapTarget.y, 100);
});

test('computePointTangencyMatch picks closest valid boundary candidate', () => {
  const match = computePointTangencyMatch(
    { x: 12, y: 9 },
    [
      { kind: 'segment', x1: 0, y1: 10, x2: 100, y2: 10, objectId: 'seg-near' },
      { kind: 'circle', x: 100, y: 100, radius: 30, objectId: 'circle-far' }
    ],
    2
  );

  assert.equal(match?.kind, 'point-segment');
  assert.equal(match?.candidate.objectId, 'seg-near');
  assert.equal(match?.snapTarget.y, 10);
});
