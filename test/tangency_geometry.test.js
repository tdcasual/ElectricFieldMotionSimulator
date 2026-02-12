import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCircleCircleTangency,
  evaluateCircleSegmentTangency,
  pickBestTangencyMatch,
  computeTangencyMatch
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
