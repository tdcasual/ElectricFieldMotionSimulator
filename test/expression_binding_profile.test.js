import test from 'node:test';
import assert from 'node:assert/strict';
import { runExpressionBindingProfiles } from './helpers/perfRunner.js';

test('expression binding profiles expose parse-load baselines across scenarios', () => {
  const profiles = runExpressionBindingProfiles({
    particleCount: 2400,
    steps: 60,
    dt: 0.016,
    sampleEverySteps: 20
  });

  assert.equal(Array.isArray(profiles), true);
  assert.equal(profiles.length, 3);

  const byName = Object.fromEntries(profiles.map((profile) => [profile.name, profile]));
  assert.deepEqual(Object.keys(byName).sort(), [
    'expression-static-fallback',
    'expression-time-bound',
    'expression-variable-bound'
  ]);

  for (const profile of profiles) {
    assert.equal(profile.particleCount, 2400);
    assert.equal(profile.peakParticles, 2400);
    assert.equal(profile.p95RefreshMs >= 0, true);
    assert.equal(profile.p95TotalStepMs >= 0, true);
    assert.equal(profile.heapUsedPeakMB >= profile.heapUsedStartMB, true);
    assert.equal(profile.checkpoints.length > 0, true);
  }

  assert.equal(byName['expression-static-fallback'].peakParseCalls, 0);
  assert.equal(byName['expression-variable-bound'].peakParseCalls, 4800);
  assert.equal(byName['expression-time-bound'].peakParseCalls, 4800);
});
